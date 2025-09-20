from pathlib import Path
text = Path(r"src/pages/Sales.tsx").read_text().splitlines()
for idx, line in enumerate(text, 1):
    if "useBusinessId" in line:
        print(idx, line.strip())
    if "fetchProducts = async" in line:
        print(idx, line.strip())
    if "fetchServiceBusinesses" in line and "async" in line:
        print(idx, line.strip())
    if "processSale = async" in line:
        print(idx, line.strip())
    if "createPartialPaymentReminder" in line and "async" in line:
        print(idx, line.strip())
