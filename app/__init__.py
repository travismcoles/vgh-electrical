from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from pathlib import Path
import os

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

PANEL_TYPES = {
    'Hydro': {'color': '#111111', 'label': 'Hydro'},
    'Vital': {'color': '#d7263d', 'label': 'Vital'},
    'Delayed Vital': {'color': '#1e88e5', 'label': 'Delayed Vital'},
    'UPS': {'color': '#ff7f11', 'label': 'UPS'},
}

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-change-me'),
        SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL', 'sqlite:///' + str(Path(app.instance_path) / 'app.db')),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        UPLOAD_FOLDER=str(Path(app.instance_path) / 'uploads'),
    )
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)

    from . import models  # noqa: F401
    from .auth import auth_bp
    from .views import main_bp
    from .api import api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    login_manager.login_view = 'auth.login'

    @app.context_processor
    def inject_globals():
        return {'PANEL_TYPES': PANEL_TYPES}

    return app
