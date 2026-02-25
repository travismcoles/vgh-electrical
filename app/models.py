from datetime import datetime
from . import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

ROLE_ADMIN = 'admin'
ROLE_CHARGEHAND = 'chargehand'
ROLE_ELECTRICIAN = 'electrician'
ROLE_SUBCONTRACTOR = 'subcontractor'
ROLE_VIEWER = 'viewer'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255))
    role = db.Column(db.String(50), default=ROLE_VIEWER)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def can_approve(self):
        return self.role in (ROLE_ADMIN, ROLE_CHARGEHAND)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class Building(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), index=True)
    name = db.Column(db.String(255), index=True)

class Panel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    building_id = db.Column(db.Integer, db.ForeignKey('building.id'))
    building = db.relationship('Building', backref='panels')

    designation = db.Column(db.String(255), index=True)
    manufacturer = db.Column(db.String(255))
    description = db.Column(db.Text)
    location = db.Column(db.String(255))
    voltage = db.Column(db.String(50))
    fed_from = db.Column(db.String(255))
    fuse_breaker = db.Column(db.String(255))
    circuit_count = db.Column(db.Integer, default=42)
    panel_type = db.Column(db.String(50), default='Hydro')
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Circuit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    panel_id = db.Column(db.Integer, db.ForeignKey('panel.id'), index=True)
    panel = db.relationship('Panel', backref='circuits')

    number = db.Column(db.Integer, index=True)
    description = db.Column(db.String(255))
    amperage = db.Column(db.Integer)
    poles = db.Column(db.Integer, default=1)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChangeRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    panel_id = db.Column(db.Integer, db.ForeignKey('panel.id'), index=True)
    circuit_id = db.Column(db.Integer, db.ForeignKey('circuit.id'), nullable=True)
    field_name = db.Column(db.String(100))
    old_value = db.Column(db.Text)
    new_value = db.Column(db.Text)
    status = db.Column(db.String(20), default='Pending')
    submitted_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    approver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    comment = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    panel_id = db.Column(db.Integer, db.ForeignKey('panel.id'))
    kind = db.Column(db.String(50))
    filename = db.Column(db.String(255))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
