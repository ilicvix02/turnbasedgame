"""Build the Contractor Job Cost & Cash Flow Tracker (PRO and FREE editions).

Usage:  python business/scripts/build_job_cost_tracker.py [out_dir]
Writes ContractorJobCostTracker-PRO.xlsx and ContractorJobCostTracker-FREE.xlsx.
Run scripts/recalc.py (xlsx skill) or open in Excel/Sheets to compute values.
"""
import sys
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from protect import apply_editing_rights

FONT = "Arial"
BLUE = Font(name=FONT, color="0000FF")
BLACK = Font(name=FONT)
GREEN = Font(name=FONT, color="008000")
BOLD = Font(name=FONT, bold=True)
HEAD = Font(name=FONT, bold=True, color="FFFFFF")
TITLE = Font(name=FONT, bold=True, size=16)
HEAD_FILL = PatternFill("solid", fgColor="1F3A5F")
INPUT_FILL = PatternFill("solid", fgColor="FFFF00")
SOFT_FILL = PatternFill("solid", fgColor="F2F5F9")
RED_FILL = PatternFill("solid", fgColor="F8D7DA")
OK_FILL = PatternFill("solid", fgColor="D4EDDA")
THIN = Side(style="thin", color="C8CFD8")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
USD = '$#,##0;($#,##0);"-"'
PCT = '0.0%;(0.0%);"-"'
DATE = "yyyy-mm-dd"
CATEGORIES = ["Labor", "Materials", "Subcontractors", "Equipment", "Other"]
STATUSES = ["Bidding", "Active", "Complete", "On Hold"]


def header(ws, row, labels, widths=None):
    for i, label in enumerate(labels, 1):
        c = ws.cell(row=row, column=i, value=label)
        c.font, c.fill, c.border = HEAD, HEAD_FILL, BOX
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        if widths:
            ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]
    ws.row_dimensions[row].height = 32
    ws.freeze_panes = ws.cell(row=row + 1, column=1)


def style_rows(ws, first, last, ncols, fonts, fmts, input_cols=()):
    for r in range(first, last + 1):
        for col in range(1, ncols + 1):
            c = ws.cell(row=r, column=col)
            c.font, c.border = fonts[col - 1], BOX
            if fmts[col - 1]:
                c.number_format = fmts[col - 1]
            if col in input_cols and r % 2 == 0:
                c.fill = SOFT_FILL


def build(lite: bool, out: Path):
    max_jobs = 3 if lite else 50
    max_log = 60 if lite else 1000
    months = 12
    wb = Workbook()

    # ---------------- Start Here ----------------
    ws = wb.active
    ws.title = "Start Here"
    ws.column_dimensions["A"].width = 4
    ws.column_dimensions["B"].width = 100
    edition = "FREE Edition (3 jobs)" if lite else "PRO Edition"
    lines = [
        (f"Contractor Job Cost & Cash Flow Tracker - {edition}", TITLE),
        ("Know which jobs make money before the job is over - not at tax time.", Font(name=FONT, italic=True)),
        ("", BLACK),
        ("HOW TO USE (10 minutes)", BOLD),
        ("1. Settings tab: enter your company name, opening cash balance, monthly overhead and start month.", BLACK),
        ("2. Jobs tab: one row per job - contract value and your estimated cost by category.", BLACK),
        ("3. Costs Log: every receipt, timesheet or sub invoice - date, job ID, category, amount.", BLACK),
        ("4. Payments Log: every deposit or progress payment you receive from a client.", BLACK),
        ("5. Job Dashboard and Cash Flow update automatically. Red = over budget or cash going negative.", BLACK),
        ("", BLACK),
        ("COLOR LEGEND", BOLD),
        ("Blue text = a value you type in.   Black text = formula, do not overwrite.   Green text = pulled from another tab.", BLACK),
        ("Yellow fill = key setting you should review first.", BLACK),
        ("Formula cells are locked so they can't be overwritten by accident. To change a formula: Review > Unprotect Sheet (no password).", BLACK),
        ("", BLACK),
        ("The example rows (jobs J-101 to J-103 and their costs/payments) show the expected format. Overwrite or delete them.", BLACK),
    ]
    if lite:
        lines += [
            ("", BLACK),
            ("UPGRADE TO PRO", BOLD),
            ("PRO adds: 50 jobs, 1,000-row logs, a 12-month cash flow forecast with negative-cash warnings,", BLACK),
            ("overhead allocation, estimate-vs-actual variance by category, and change-order tracking.", BLACK),
            ("Get it here: [YOUR GUMROAD / LEMON SQUEEZY LINK]", Font(name=FONT, bold=True, color="0000FF")),
        ]
    for i, (text, font) in enumerate(lines, 1):
        c = ws.cell(row=i + 1, column=2, value=text)
        c.font = font
    ws["B14"].fill = INPUT_FILL

    # ---------------- Settings ----------------
    st = wb.create_sheet("Settings")
    st.column_dimensions["A"].width = 34
    st.column_dimensions["B"].width = 22
    st.column_dimensions["C"].width = 60
    header(st, 1, ["Setting", "Value", "Notes"])
    settings = [
        ("Company name", "Acme Renovations LLC", None, "Shown on dashboards."),
        ("Opening cash balance ($)", 15000, USD, "Bank balance on the start month's first day."),
        ("Monthly fixed overhead ($)", 1500, USD, "Rent, insurance, truck, software, office salary. Example value - replace."),
        ("Target margin after overhead (%)", 0.10, PCT, "Jobs projected below this are flagged. Example value - set your own."),
        ("Forecast start month", date(2026, 1, 1), DATE, "Enter the 1st day of a month."),
    ]
    for r, (label, val, fmt, note) in enumerate(settings, 2):
        st.cell(row=r, column=1, value=label).font = BLACK
        v = st.cell(row=r, column=2, value=val)
        v.font, v.fill = BLUE, INPUT_FILL
        if fmt:
            v.number_format = fmt
        st.cell(row=r, column=3, value=note).font = Font(name=FONT, italic=True, color="666666")
        for col in range(1, 4):
            st.cell(row=r, column=col).border = BOX
    S_CASH, S_OVH, S_MARGIN, S_START = "Settings!$B$3", "Settings!$B$4", "Settings!$B$5", "Settings!$B$6"

    # ---------------- Jobs ----------------
    jb = wb.create_sheet("Jobs")
    jcols = ["Job ID", "Client", "Job description", "Status", "Start date", "Contract value ($)",
             "Change orders ($)", "Est. labor ($)", "Est. materials ($)", "Est. subs ($)",
             "Est. equipment ($)", "Est. other ($)", "Est. total cost ($)", "Est. margin (%)"]
    header(jb, 1, jcols, [10, 22, 30, 12, 12, 15, 14, 13, 14, 13, 14, 12, 15, 12])
    examples = [
        ("J-101", "Miller", "Kitchen remodel", "Active", date(2026, 1, 5), 48000, 2500, 14000, 12000, 6000, 1200, 800),
        ("J-102", "Okafor", "Deck + pergola", "Complete", date(2026, 1, 12), 22000, 0, 6500, 7000, 0, 600, 400),
        ("J-103", "Chen", "Basement finish", "Active", date(2026, 2, 2), 61000, 0, 18000, 14000, 11000, 1500, 1000),
    ]
    last_job = max_jobs + 1
    for r in range(2, last_job + 1):
        if r - 2 < len(examples):
            for col, val in enumerate(examples[r - 2], 1):
                jb.cell(row=r, column=col, value=val)
        jb.cell(row=r, column=13, value=f'=IF(A{r}="","",SUM(H{r}:L{r}))')
        jb.cell(row=r, column=14, value=f'=IF(OR(A{r}="",F{r}+G{r}=0),"",(F{r}+G{r}-M{r})/(F{r}+G{r}))')
    fonts = [BLUE] * 12 + [BLACK, BLACK]
    fmts = [None, None, None, None, DATE] + [USD] * 8 + [PCT]
    style_rows(jb, 2, last_job, 14, fonts, fmts, input_cols=range(1, 13))
    dv = DataValidation(type="list", formula1='"' + ",".join(STATUSES) + '"', allow_blank=True)
    jb.add_data_validation(dv)
    dv.add(f"D2:D{last_job}")
    jb.conditional_formatting.add(f"N2:N{last_job}", FormulaRule(
        formula=[f'AND(N2<>"",N2<{S_MARGIN})'], fill=RED_FILL))
    jb["G1"].comment = Comment("Approved change orders added to the contract value.", "Tracker")
    jobs_ref = f"Jobs!$A$2:$A${last_job}"

    # ---------------- Costs Log ----------------
    cl = wb.create_sheet("Costs Log")
    header(cl, 1, ["Date", "Job ID", "Category", "Vendor / worker", "Description", "Amount ($)"],
           [12, 10, 16, 24, 34, 14])
    cost_ex = [
        (date(2026, 1, 8), "J-101", "Materials", "Home Depot", "Cabinets deposit", 6200),
        (date(2026, 1, 15), "J-101", "Labor", "Crew payroll", "Week 2 demo + framing", 4100),
        (date(2026, 1, 14), "J-102", "Materials", "84 Lumber", "Composite decking", 7400),
        (date(2026, 1, 21), "J-102", "Labor", "Crew payroll", "Deck build", 6900),
        (date(2026, 2, 3), "J-101", "Subcontractors", "Spark Electric", "Rough-in electrical", 3800),
        (date(2026, 2, 10), "J-103", "Materials", "ABC Supply", "Drywall + insulation", 5200),
        (date(2026, 2, 18), "J-101", "Labor", "Crew payroll", "Install cabinets", 5600),
        (date(2026, 3, 4), "J-103", "Labor", "Crew payroll", "Framing", 6100),
    ]
    last_log = max_log + 1
    for r, row in enumerate(cost_ex, 2):
        for col, val in enumerate(row, 1):
            cl.cell(row=r, column=col, value=val)
    style_rows(cl, 2, last_log, 6, [BLUE] * 6, [DATE, None, None, None, None, USD], input_cols=range(1, 7))
    dv_cat = DataValidation(type="list", formula1='"' + ",".join(CATEGORIES) + '"', allow_blank=True)
    dv_job = DataValidation(type="list", formula1=jobs_ref, allow_blank=True)
    cl.add_data_validation(dv_cat)
    cl.add_data_validation(dv_job)
    dv_cat.add(f"C2:C{last_log}")
    dv_job.add(f"B2:B{last_log}")

    # ---------------- Payments Log ----------------
    pl = wb.create_sheet("Payments Log")
    header(pl, 1, ["Date", "Job ID", "Invoice #", "Note", "Amount received ($)"], [12, 10, 12, 34, 18])
    pay_ex = [
        (date(2026, 1, 5), "J-101", "INV-001", "Deposit 30%", 14400),
        (date(2026, 1, 12), "J-102", "INV-002", "Deposit 50%", 11000),
        (date(2026, 1, 30), "J-102", "INV-003", "Final", 11000),
        (date(2026, 2, 2), "J-103", "INV-004", "Deposit 25%", 15250),
        (date(2026, 2, 20), "J-101", "INV-005", "Progress 40%", 19200),
    ]
    for r, row in enumerate(pay_ex, 2):
        for col, val in enumerate(row, 1):
            pl.cell(row=r, column=col, value=val)
    style_rows(pl, 2, last_log, 5, [BLUE] * 5, [DATE, None, None, None, USD], input_cols=range(1, 6))
    dv_job2 = DataValidation(type="list", formula1=jobs_ref, allow_blank=True)
    pl.add_data_validation(dv_job2)
    dv_job2.add(f"B2:B{last_log}")

    C_DATE, C_JOB, C_CAT, C_AMT = (f"'Costs Log'!$A$2:$A${last_log}", f"'Costs Log'!$B$2:$B${last_log}",
                                   f"'Costs Log'!$C$2:$C${last_log}", f"'Costs Log'!$F$2:$F${last_log}")
    P_DATE, P_JOB, P_AMT = (f"'Payments Log'!$A$2:$A${last_log}", f"'Payments Log'!$B$2:$B${last_log}",
                            f"'Payments Log'!$E$2:$E${last_log}")

    # ---------------- Job Dashboard ----------------
    db = wb.create_sheet("Job Dashboard")
    if lite:
        dcols = ["Job ID", "Client", "Status", "Contract + COs ($)", "Est. cost ($)", "Actual cost ($)",
                 "% of budget used", "Received ($)", "Profit so far ($)", "Margin if job ended now (%)", "Flag"]
        widths = [10, 18, 12, 16, 14, 14, 13, 14, 15, 15, 16]
    else:
        dcols = ["Job ID", "Client", "Status", "Contract + COs ($)", "Est. cost ($)"] + \
                [f"Actual {c.lower()} ($)" for c in CATEGORIES] + \
                ["Actual cost ($)", "% of budget used", "Labor variance ($)", "Materials variance ($)",
                 "Received ($)", "Outstanding to bill ($)", "Profit so far ($)",
                 "Overhead share ($)", "Projected net margin (%)", "Flag"]
        widths = [10, 18, 12, 16, 14] + [14] * 5 + [14, 12, 14, 15, 14, 16, 15, 15, 15, 16]
    db.cell(row=1, column=1, value="=Settings!B2&\" - Job Dashboard\"").font = Font(name=FONT, bold=True, size=14, color="008000")
    header(db, 3, dcols, widths)
    db.freeze_panes = "B4"
    first = 4
    last_db = first + max_jobs - 1
    for i, r in enumerate(range(first, last_db + 1)):
        j = i + 2  # row on Jobs
        f = {}
        f["A"] = f'=IF(Jobs!A{j}="","",Jobs!A{j})'
        f["B"] = f'=IF(A{r}="","",Jobs!B{j})'
        f["C"] = f'=IF(A{r}="","",Jobs!D{j})'
        f["D"] = f'=IF(A{r}="","",Jobs!F{j}+Jobs!G{j})'
        f["E"] = f'=IF(A{r}="","",Jobs!M{j})'
        if lite:
            f["F"] = f'=IF(A{r}="","",SUMIFS({C_AMT},{C_JOB},A{r}))'
            f["G"] = f'=IF(OR(A{r}="",E{r}=0),"",F{r}/E{r})'
            f["H"] = f'=IF(A{r}="","",SUMIFS({P_AMT},{P_JOB},A{r}))'
            f["I"] = f'=IF(A{r}="","",H{r}-F{r})'
            f["J"] = f'=IF(OR(A{r}="",D{r}=0),"",(D{r}-MAX(E{r},F{r}))/D{r})'
            f["K"] = f'=IF(A{r}="","",IF(F{r}>E{r},"OVER BUDGET",IF(J{r}<{S_MARGIN},"Low margin","OK")))'
            fonts = [GREEN, GREEN, GREEN, GREEN, GREEN, BLACK, BLACK, BLACK, BLACK, BLACK, BOLD]
            fmts = [None, None, None, USD, USD, USD, PCT, USD, USD, PCT, None]
            pct_col, flag_col = "G", "K"
        else:
            for k, cat in enumerate(CATEGORIES):
                col = get_column_letter(6 + k)
                f[col] = f'=IF($A{r}="","",SUMIFS({C_AMT},{C_JOB},$A{r},{C_CAT},"{cat}"))'
            f["K"] = f'=IF(A{r}="","",SUM(F{r}:J{r}))'
            f["L"] = f'=IF(OR(A{r}="",E{r}=0),"",K{r}/E{r})'
            f["M"] = f'=IF(A{r}="","",Jobs!H{j}-F{r})'
            f["N"] = f'=IF(A{r}="","",Jobs!I{j}-G{r})'
            f["O"] = f'=IF(A{r}="","",SUMIFS({P_AMT},{P_JOB},A{r}))'
            f["P"] = f'=IF(A{r}="","",D{r}-O{r})'
            f["Q"] = f'=IF(A{r}="","",O{r}-K{r})'
            # Overhead share: allocate 12 months of overhead by each active/complete job's share of contract value.
            f["R"] = (f'=IF(OR(A{r}="",C{r}="Bidding"),"",IFERROR({S_OVH}*12*D{r}/'
                      f'SUMIFS($D${first}:$D${last_db},$C${first}:$C${last_db},"<>Bidding"),0))')
            f["S"] = f'=IF(OR(A{r}="",D{r}=0),"",(D{r}-MAX(E{r},K{r})-N(R{r}))/D{r})'
            f["T"] = f'=IF(A{r}="","",IF(K{r}>E{r},"OVER BUDGET",IF(S{r}<{S_MARGIN},"Low margin","OK")))'
            fonts = [GREEN] * 5 + [BLACK] * 14 + [BOLD]
            fmts = [None, None, None, USD, USD] + [USD] * 6 + [PCT, USD, USD, USD, USD, USD, USD, PCT, None]
            pct_col, flag_col = "L", "T"
        for col, formula in f.items():
            db[f"{col}{r}"] = formula
    style_rows(db, first, last_db, len(dcols), fonts, fmts)
    rng = f"{flag_col}{first}:{flag_col}{last_db}"
    db.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"OVER BUDGET"'], fill=RED_FILL))
    db.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Low margin"'], fill=PatternFill("solid", fgColor="FFF3CD")))
    db.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"OK"'], fill=OK_FILL))
    db.conditional_formatting.add(f"{pct_col}{first}:{pct_col}{last_db}",
                                  FormulaRule(formula=[f'AND({pct_col}{first}<>"",{pct_col}{first}>1)'], fill=RED_FILL))
    if not lite:
        db["R3"].comment = Comment("12 months of Settings overhead, split across non-Bidding jobs by contract value.", "Tracker")
        tot = last_db + 1
        db.cell(row=tot, column=1, value="TOTAL").font = BOLD
        for col in ["D", "E", "F", "G", "H", "I", "J", "K", "M", "N", "O", "P", "Q", "R"]:
            c = db[f"{col}{tot}"]
            c.value = f"=SUM({col}{first}:{col}{last_db})"
            c.font, c.number_format, c.border = BOLD, USD, BOX

    # ---------------- Cash Flow (PRO only) ----------------
    if not lite:
        cf = wb.create_sheet("Cash Flow")
        cf["A1"] = '=Settings!B2&" - 12-Month Cash Flow"'
        cf["A1"].font = Font(name=FONT, bold=True, size=14, color="008000")
        header(cf, 3, ["Month", "Cash in: client payments ($)", "Cash out: job costs ($)",
                       "Cash out: overhead ($)", "Net cash flow ($)", "Ending cash balance ($)", "Warning"],
               [12, 20, 20, 18, 18, 20, 24])
        for i in range(months):
            r = 4 + i
            cf[f"A{r}"] = f"=EDATE({S_START},{i})"
            cf[f"B{r}"] = f'=SUMIFS({P_AMT},{P_DATE},">="&A{r},{P_DATE},"<"&EDATE(A{r},1))'
            cf[f"C{r}"] = f'=SUMIFS({C_AMT},{C_DATE},">="&A{r},{C_DATE},"<"&EDATE(A{r},1))'
            cf[f"D{r}"] = f"={S_OVH}"
            cf[f"E{r}"] = f"=B{r}-C{r}-D{r}"
            cf[f"F{r}"] = f"={S_CASH}+E{r}" if i == 0 else f"=F{r-1}+E{r}"
            cf[f"G{r}"] = f'=IF(F{r}<0,"CASH SHORTFALL",IF(F{r}<{S_OVH},"Below 1 month overhead",""))'
        style_rows(cf, 4, 3 + months, 7, [BLACK, BLACK, BLACK, GREEN, BLACK, BLACK, BOLD],
                   ["mmm yyyy", USD, USD, USD, USD, USD, None])
        cf.conditional_formatting.add(f"F4:F{3+months}", CellIsRule(operator="lessThan", formula=["0"], fill=RED_FILL))
        cf.conditional_formatting.add(f"G4:G{3+months}", CellIsRule(operator="equal", formula=['"CASH SHORTFALL"'], fill=RED_FILL))
        tr = 4 + months
        cf[f"A{tr}"] = "TOTAL"
        cf[f"A{tr}"].font = BOLD
        for col in "BCDE":
            cf[f"{col}{tr}"] = f"=SUM({col}4:{col}{3+months})"
            cf[f"{col}{tr}"].font, cf[f"{col}{tr}"].number_format = BOLD, USD
        cf[f"A{tr+2}"] = ("Tip: add expected future payments (with a future date) to the Payments Log "
                          "to turn this into a forecast. Remove them if the client pays late.")
        cf[f"A{tr+2}"].font = Font(name=FONT, italic=True, color="666666")

    ws.sheet_view.showGridLines = False
    apply_editing_rights(wb)
    wb.save(out)


if __name__ == "__main__":
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "products")
    out_dir.mkdir(parents=True, exist_ok=True)
    build(False, out_dir / "ContractorJobCostTracker-PRO.xlsx")
    build(True, out_dir / "ContractorJobCostTracker-FREE.xlsx")
    print("built", out_dir)
