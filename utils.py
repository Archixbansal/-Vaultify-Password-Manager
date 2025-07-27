import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import url_for

def send_reset_email(user_email, token):
    reset_url = url_for('reset_password', token=token, _external=True)
    subject = "Password Reset Request"
    body = f"""
    <p>Hi,</p>
    <p>You requested to reset your password. Click the link below:</p>
    <p><a href="{reset_url}">{reset_url}</a></p>
    <p>This link expires in 30 minutes.</p>
    """

    msg = MIMEMultipart()
    msg['From'] = "Vaultify <no-reply@vaultify.com>"
    msg['To'] = user_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASS'))
            server.sendmail(os.getenv('EMAIL_USER'), user_email, msg.as_string())
    except Exception as e:
        print("Email Error:", e)
