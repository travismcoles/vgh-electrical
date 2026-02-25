from getpass import getpass
from app import create_app, db
from app.models import User, ROLE_ADMIN
app = create_app()
with app.app_context():
    email = input('Admin email: ').strip().lower()
    name = input('Name (optional): ').strip()
    password = getpass('Password: ')
    existing = User.query.filter_by(email=email).first()
    if existing:
        print('User exists, updating role/password...')
        existing.role = ROLE_ADMIN
        existing.set_password(password)
        db.session.commit()
        print('Updated.')
    else:
        u = User(email=email, name=name, role=ROLE_ADMIN)
        u.set_password(password)
        db.session.add(u)
        db.session.commit()
        print('Admin created.')
