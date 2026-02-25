from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from sqlalchemy import or_, asc, desc
from datetime import datetime
from . import db, PANEL_TYPES
from .models import User, Building, Panel, Circuit, ChangeRequest

main_bp = Blueprint('main', __name__)

def can_edit():
    return current_user.is_authenticated and current_user.role in ('admin','chargehand','electrician')

def can_approve():
    return current_user.is_authenticated and current_user.role in ('admin','chargehand')

@main_bp.route('/')
@login_required
def dashboard():
    q = request.args.get('q','').strip()
    panel_type = request.args.get('type','')
    sort = request.args.get('sort','designation')

    query = Panel.query
    if panel_type:
        query = query.filter(Panel.panel_type == panel_type)
    if q:
        like = f"%{q}%"
        query = query.join(Building).filter(or_(Panel.designation.ilike(like), Panel.description.ilike(like), Building.name.ilike(like), Building.code.ilike(like)))

    if sort == 'designation':
        query = query.order_by(asc(Panel.designation))
    elif sort == 'circuit_count':
        query = query.order_by(desc(Panel.circuit_count))
    elif sort == 'type':
        query = query.order_by(asc(Panel.panel_type), asc(Panel.designation))

    panels = query.all()
    groups = {}
    for p in panels:
        bname = f"{p.building.code} — {p.building.name}" if p.building and p.building.code else (p.building.name if p.building else 'Unknown')
        groups.setdefault(bname, []).append(p)

    return render_template('panels_list.html', groups=groups, q=q, panel_type=panel_type, sort=sort, PANEL_TYPES=PANEL_TYPES)

@main_bp.route('/panel/<int:panel_id>')
@login_required
def panel_detail(panel_id):
    panel = Panel.query.get_or_404(panel_id)
    nums = set(c.number for c in panel.circuits)
    for n in range(1, (panel.circuit_count or 42)+1):
        if n not in nums:
            c = Circuit(panel=panel, number=n, description='', amperage=None, poles=1)
            db.session.add(c)
    db.session.commit()

    circuits = {c.number: c for c in panel.circuits}
    max_n = panel.circuit_count or 42
    odd_rows, even_rows = [], []
    skip = set()
    for n in range(1, max_n+1):
        if n in skip:
            continue
        c = circuits[n]
        group = [c]
        if c.poles == 2 and n+1 <= max_n:
            group.append(circuits[n+1]); skip.add(n+1)
        elif c.poles == 3 and n+2 <= max_n:
            group.extend([circuits[n+1], circuits[n+2]]); skip.update({n+1, n+2})
        if n % 2 == 1: odd_rows.append((n, group))
        else: even_rows.append((n, group))

    return render_template('panel_detail.html', panel=panel, odd_rows=odd_rows, even_rows=even_rows, can_edit=can_edit(), can_approve=can_approve())

@main_bp.route('/panel/<int:panel_id>/edit', methods=['POST'])
@login_required
def panel_edit(panel_id):
    if not can_edit():
        flash('You do not have edit permission', 'warning')
        return redirect(url_for('main.panel_detail', panel_id=panel_id))
    panel = Panel.query.get_or_404(panel_id)
    panel.description = request.form.get('description','')
    panel.location = request.form.get('location','')
    panel.voltage = request.form.get('voltage','')
    panel.fed_from = request.form.get('fed_from','')
    panel.fuse_breaker = request.form.get('fuse_breaker','')
    panel.panel_type = request.form.get('panel_type','Hydro')
    panel.notes = request.form.get('notes','')
    cc = request.form.get('circuit_count')
    try:
        cc = int(cc); panel.circuit_count = max(1, min(cc, 84))
    except (TypeError, ValueError):
        pass
    for key, val in request.form.items():
        if key.startswith('c_desc_'):
            n = int(key.split('_')[-1])
            c = next((x for x in panel.circuits if x.number == n), None)
            if c: c.description = val
        if key.startswith('c_amp_'):
            n = int(key.split('_')[-1])
            c = next((x for x in panel.circuits if x.number == n), None)
            if c:
                try: c.amperage = int(val) if val else None
                except ValueError: c.amperage = None
        if key.startswith('c_poles_'):
            n = int(key.split('_')[-1])
            c = next((x for x in panel.circuits if x.number == n), None)
            if c:
                try: c.poles = int(val) if val in ('1','2','3') else 1
                except ValueError: c.poles = 1
    db.session.commit()
    flash('Panel updated', 'success')
    return redirect(url_for('main.panel_detail', panel_id=panel_id))

@main_bp.route('/panel/<int:panel_id>/print')
@login_required
def panel_print(panel_id):
    panel = Panel.query.get_or_404(panel_id)
    circuits = {c.number: c for c in panel.circuits}
    max_n = panel.circuit_count or 42
    odd_rows = [(n, circuits.get(n)) for n in range(1, max_n+1, 2)]
    even_rows = [(n, circuits.get(n)) for n in range(2, max_n+1, 2)]
    printed_at = datetime.now()
    return render_template('panel_print.html', panel=panel, odd_rows=odd_rows, even_rows=even_rows, printed_at=printed_at)

@main_bp.route('/users')
@login_required
def users():
    if current_user.role != 'admin':
        flash('Admins only', 'warning')
        return redirect(url_for('main.dashboard'))
    people = User.query.order_by(User.created_at.desc()).all()
    return render_template('users.html', users=people)

@main_bp.route('/panel/<int:panel_id>/qr-labels')
@login_required
def qr_labels(panel_id):
    panel = Panel.query.get_or_404(panel_id)
    return render_template('qr_labels.html', panel=panel)
