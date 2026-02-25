from flask import Blueprint, send_file, abort
from io import BytesIO
import qrcode
from .models import Panel

api_bp = Blueprint('api', __name__)

@api_bp.get('/qr/panel/<int:panel_id>.png')
def qr_panel(panel_id):
    panel = Panel.query.get(panel_id)
    if not panel:
        abort(404)
    content = f"/panel/{panel.id}"
    img = qrcode.make(content)
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')
