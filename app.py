from flask import Flask, render_template, request, redirect, session, url_for, Response
from pymongo import MongoClient
from cryptography.fernet import Fernet
from bson.objectid import ObjectId
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
import hashlib
from dotenv import load_dotenv
import os
import csv
import io
from datetime import datetime
import random

# Load environment variables
load_dotenv()
SENDER_EMAIL = os.getenv('EMAIL_USER')
SENDER_PASSWORD = os.getenv('EMAIL_PASS')
RESET_SECRET = os.getenv('RESET_SECRET_KEY')

# Load encryption key
with open("key.key", "rb") as key_file:
    key = key_file.read()
cipher = Fernet(key)

# Password hashing
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Flask app setup
app = Flask(__name__)
app.secret_key = 'archi19012004bansal'

# MongoDB setup
client = MongoClient("mongodb+srv://archi:Archi1901@passwordmanager.8xndbd2.mongodb.net/?retryWrites=true&w=majority&appName=passwordManager")
db = client['password_manager']
users_collection = db['users']
passwords_collection = db['saved_passwords']

# Flask-Mail setup
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = SENDER_EMAIL
app.config['MAIL_PASSWORD'] = SENDER_PASSWORD
mail = Mail(app)

# Token serializer
serializer = URLSafeTimedSerializer(app.secret_key)
def generate_reset_token(email):
    return serializer.dumps(email, salt='password-reset-salt')
def verify_reset_token(token, expiration=3600):
    try:
        return serializer.loads(token, salt='password-reset-salt', max_age=expiration)
    except:
        return None

# Routes
@app.route("/")
def home():
    return render_template("home.html")

@app.route('/register', methods=['GET', 'POST'])
def register():
    message = ''
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']

        if users_collection.find_one({'email': email}):
            message = "User already exists!"
        else:
            users_collection.insert_one({'name': name, 'email': email, 'password': hash_password(password)})
            message = "Registered successfully!"
    return render_template('register.html', message=message)

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = ''
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = users_collection.find_one({'email': email, 'password': hash_password(password)})
        if user:
            session['email'] = email
            session['name'] = user['name']
            return redirect(url_for('dashboard'))
        else:
            error = "Invalid email or password."
    return render_template('login.html', error=error)
@app.route('/dashboard')
def dashboard():
    if 'email' in session:
        # Total passwords
        total_passwords = passwords_collection.count_documents({'user_email': session['email']})

        # Recent 5 passwords (sorted by added_at)
        recent_passwords = list(
            passwords_collection.find({'user_email': session['email']})
            .sort('added_at', -1)
            .limit(5)
        )

        for item in recent_passwords:
            item['_id'] = str(item['_id'])

            # Decrypt password
            if 'password' in item:
                item['password'] = cipher.decrypt(item['password'].encode()).decode()

            # Format added_at or set default
            if 'added_at' in item and isinstance(item['added_at'], datetime):
                item['added_at'] = item['added_at'].strftime('%d %b %Y, %I:%M %p')
            else:
                item['added_at'] = "Unknown"

        # Random tip
        tips = [
            "Use 2FA wherever possible!",
            "Never reuse the same password.",
            "Change important passwords every 3 months.",
            "Use a mix of uppercase, lowercase, numbers & symbols.",
            "Don't share passwords over email or chat."
        ]
        tip = random.choice(tips)

        return render_template(
            'dashboard.html',
            name=session['name'],
            recent=recent_passwords,
            total=total_passwords,
            tip=tip
        )

    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.pop('email', None)
    return redirect(url_for('login'))

@app.route('/add_password', methods=['GET', 'POST'])
def add_password():
    if 'email' not in session:
        return redirect(url_for('login'))
    if request.method == 'POST':
        account = request.form['account']
        username = request.form['username']
        password = cipher.encrypt(request.form['password'].encode()).decode()

        existing = passwords_collection.find_one({
            'user_email': session['email'],
            'account': account,
            'username': username
        })
        if existing:
            return render_template('add_password.html', message="This account already exists!")
        else:
            passwords_collection.insert_one({
                'user_email': session['email'],
                'account': account,
                'username': username,
                'password': password,
                'added_at': datetime.now()
            })
            return redirect(url_for('view_passwords'))
    return render_template('add_password.html')

@app.route('/view_passwords')
def view_passwords():
    if 'email' not in session:
        return redirect(url_for('login'))
    user_passwords = list(passwords_collection.find({'user_email': session['email']}))
    for item in user_passwords:
        item['_id'] = str(item['_id'])
        item['password'] = cipher.decrypt(item['password'].encode()).decode()
        if 'added_at' not in item:
            item['added_at'] = datetime.now()
    return render_template('view_passwords.html', passwords=user_passwords)

@app.route('/delete_password/<password_id>', methods=['POST'])
def delete_password(password_id):
    if 'email' not in session:
        return redirect(url_for('login'))
    passwords_collection.delete_one({'_id': ObjectId(password_id), 'user_email': session['email']})
    return redirect(url_for('view_passwords'))

@app.route('/edit_password/<password_id>', methods=['GET', 'POST'])
def edit_password(password_id):
    if 'email' not in session:
        return redirect(url_for('login'))
    password_item = passwords_collection.find_one({'_id': ObjectId(password_id), 'user_email': session['email']})
    if not password_item:
        return redirect(url_for('view_passwords'))
    if request.method == 'POST':
        account = request.form['account']
        username = request.form['username']
        password = cipher.encrypt(request.form['password'].encode()).decode()
        passwords_collection.update_one(
            {'_id': ObjectId(password_id)},
            {'$set': {'account': account, 'username': username, 'password': password}}
        )
        return redirect(url_for('view_passwords'))
    password_item['password'] = cipher.decrypt(password_item['password'].encode()).decode()
    if 'added_at' not in password_item:
        password_item['added_at'] = datetime.now()
    return render_template('edit_password.html', item=password_item)

# Forgot Password
@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    message = ''
    if request.method == 'POST':
        email = request.form['email']
        user = users_collection.find_one({'email': email})
        if user:
            token = generate_reset_token(email)
            reset_link = url_for('reset_password', token=token, _external=True)
            msg = Message('Password Reset Request', sender=SENDER_EMAIL, recipients=[email])
            msg.body = f"Hi {user['name']},\n\nClick this link to reset your password:\n{reset_link}\n\nLink valid for 1 hour."
            mail.send(msg)
            message = "A password reset link has been sent to your email."
        else:
            message = "No account found with that email."
    return render_template('forgot_password.html', message=message)

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    email = verify_reset_token(token)
    error = ''
    if not email:
        return "<h3 style='color:red;'>Invalid or expired link. Please request a new password reset.</h3>"
    if request.method == 'POST':
        new_password = request.form['password']
        confirm_password = request.form['confirm_password']
        if new_password != confirm_password:
            error = "Passwords do not match."
        else:
            users_collection.update_one({'email': email}, {'$set': {'password': hash_password(new_password)}})
            return redirect(url_for('login'))
    return render_template('reset_password.html', error=error)

# Export Passwords as CSV
@app.route('/export_passwords')
def export_passwords():
    if 'email' not in session:
        return redirect(url_for('login'))

    user_passwords = list(passwords_collection.find({'user_email': session['email']}))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Account', 'Username', 'Password'])

    for item in user_passwords:
        decrypted_password = cipher.decrypt(item['password'].encode()).decode()
        writer.writerow([item['account'], item['username'], decrypted_password])

    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers["Content-Disposition"] = "attachment; filename=passwords.csv"
    return response

if __name__ == "__main__":
    app.run(debug=True)
