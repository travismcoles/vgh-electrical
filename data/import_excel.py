import sys
import pandas as pd
from pathlib import Path
from app import create_app, db
from app.models import Building, Panel, Circuit
USAGE = 'Usage: python data/import_excel.py <excel_path>'

def main(xlsx_path: str):
    app = create_app()
    with app.app_context():
        xlsx = Path(xlsx_path)
        if not xlsx.exists():
            print(f'File not found: {xlsx}')
            return
        xl = pd.ExcelFile(xlsx)
        panels_df = xl.parse('Panels')
        circuits_df = xl.parse('Circuits')
        for _, row in panels_df.iterrows():
            bcode = str(row.get('BuildingCode') or '').strip()
            bname = str(row.get('Building') or '').strip()
            b = Building.query.filter_by(code=bcode).first()
            if not b:
                from app import db
                b = Building(code=bcode, name=bname or bcode)
                db.session.add(b); db.session.flush()
            p = Panel(
                building=b,
                designation=str(row.get('PanelDesignation') or '').strip(),
                manufacturer=str(row.get('Manufacturer') or '').strip(),
                description=str(row.get('Description') or '').strip(),
                location=str(row.get('Location') or '').strip(),
                voltage=str(row.get('Voltage') or '').strip(),
                fed_from=str(row.get('FedFrom') or '').strip(),
                fuse_breaker=str(row.get('FuseBreaker') or '').strip(),
                circuit_count=int(row.get('CircuitCount') or 42),
                panel_type=str(row.get('PanelType') or 'Hydro').strip() or 'Hydro',
            )
            db.session.add(p)
        db.session.commit()
        for _, row in circuits_df.iterrows():
            pdes = str(row.get('PanelDesignation') or '').strip()
            number = int(row.get('Circuit Number') or row.get('CircuitNumber'))
            p = Panel.query.filter_by(designation=pdes).first()
            if not p:
                continue
            c = Circuit(panel=p, number=number, description=str(row.get('Description') or '').strip(), amperage=int(row.get('Amperage') or 0) or None, poles=int(row.get('Poles') or 1))
            db.session.add(c)
        db.session.commit()
        print('Import complete')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(USAGE)
    else:
        main(sys.argv[1])
