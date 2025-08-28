#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import json
import sqlite3
import datetime
import re
import bcrypt
from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# Inicializar a aplicação Flask
app = Flask(__name__)
CORS(app, supports_credentials=True)  # Habilitar CORS para todas as rotas com suporte a credenciais

# Configuração da sessão
app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key_12345')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=7)

# Configuração do banco de dados
DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'negotiation_training.db')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Garantir que o diretório de dados exista
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Função para inicializar o banco de dados
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Criar tabela de usuários
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Criar tabela de exercícios
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        exercise_type TEXT NOT NULL,
        status TEXT DEFAULT 'not-started',
        time_spent INTEGER DEFAULT 0,
        data TEXT,
        last_activity TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Criar tabela de dias de treinamento
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS training_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        day_number INTEGER NOT NULL,
        status TEXT DEFAULT 'not-started',
        time_spent INTEGER DEFAULT 0,
        last_activity TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Criar tabela de histórico de atividades
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS activity_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Inicializar o banco de dados na inicialização da aplicação
@app.before_first_request
def setup():
    init_db()

# Rota para login de usuário
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Dados incompletos'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Buscar usuário pelo email
    cursor.execute('SELECT * FROM users WHERE email = ?', (data['email'],))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    # Verificar senha
    if bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
        # Criar sessão
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        
        # Retornar dados do usuário
        result = {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'message': 'Login realizado com sucesso'
        }
        conn.close()
        return jsonify(result), 200
    else:
        conn.close()
        return jsonify({'error': 'Senha incorreta'}), 401

# Rota para logout
@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('user_email', None)
    return jsonify({'message': 'Logout realizado com sucesso'}), 200

# Rota para verificar se o usuário está autenticado
@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'user_id': session['user_id'],
            'user_email': session['user_email']
        }), 200
    else:
        return jsonify({'authenticated': False}), 200

# Middleware para verificar autenticação
def require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Não autorizado'}), 401
        return f(*args, **kwargs)
    return decorated

# Rota para obter dados do usuário
@app.route('/api/user/<int:user_id>', methods=['GET'])
@require_auth
def get_user_data(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Obter dados do usuário
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    # Obter exercícios do usuário
    cursor.execute('SELECT * FROM exercises WHERE user_id = ?', (user_id,))
    exercises = cursor.fetchall()
    
    # Obter dias de treinamento do usuário
    cursor.execute('SELECT * FROM training_days WHERE user_id = ?', (user_id,))
    training_days = cursor.fetchall()
    
    # Obter histórico de atividades do usuário
    cursor.execute('SELECT * FROM activity_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', (user_id,))
    activity_history = cursor.fetchall()
    
    # Calcular tempo total gasto
    cursor.execute('SELECT SUM(time_spent) FROM exercises WHERE user_id = ?', (user_id,))
    exercises_time = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT SUM(time_spent) FROM training_days WHERE user_id = ?', (user_id,))
    training_days_time = cursor.fetchone()[0] or 0
    
    total_time_spent = exercises_time + training_days_time
    
    # Preparar dados para retorno
    user_data = {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'created_at': user['created_at'],
        'exercises': {},
        'trainingDays': {},
        'activityHistory': [],
        'totalTimeSpent': total_time_spent
    }
    
    # Processar exercícios
    for exercise in exercises:
        user_data['exercises'][exercise['exercise_type']] = {
            'status': exercise['status'],
            'timeSpent': exercise['time_spent'],
            'lastActivity': exercise['last_activity'],
            'data': json.loads(exercise['data']) if exercise['data'] else {}
        }
    
    # Processar dias de treinamento
    for day in training_days:
        user_data['trainingDays'][day['day_number']] = {
            'status': day['status'],
            'timeSpent': day['time_spent'],
            'lastActivity': day['last_activity']
        }
    
    # Processar histórico de atividades
    for activity in activity_history:
        user_data['activityHistory'].append({
            'title': activity['title'],
            'type': activity['activity_type'],
            'duration': activity['duration'],
            'date': activity['created_at']
        })
    
    conn.close()
    return jsonify(user_data)

# Rota para criar um novo usuário
@app.route('/api/user', methods=['POST'])
def create_user():
    data = request.json
    
    if not data or 'name' not in data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Dados incompletos'}), 400
    
    # Validar email
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(data['email']):
        return jsonify({'error': 'Email inválido'}), 400
    
    # Validar senha (mínimo 6 caracteres)
    if len(data['password']) < 6:
        return jsonify({'error': 'A senha deve ter pelo menos 6 caracteres'}), 400
    
    # Hash da senha
    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Inserir novo usuário
        cursor.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
                      (data['name'], data['email'], hashed_password))
        user_id = cursor.lastrowid
        
        # Inicializar exercícios para o usuário
        exercise_types = ['batna', 'meso', 'concessoes', 'spin', 'ancora', 'email', 'gravacao', 'taticas', 'framing', 'pos']
        for exercise_type in exercise_types:
            cursor.execute(
                'INSERT INTO exercises (user_id, exercise_type, data) VALUES (?, ?, ?)',
                (user_id, exercise_type, '{}')
            )
        
        # Inicializar dias de treinamento para o usuário
        for day in range(1, 15):
            cursor.execute(
                'INSERT INTO training_days (user_id, day_number) VALUES (?, ?)',
                (user_id, day)
            )
        
        conn.commit()
        
        # Retornar o ID do novo usuário
        result = {'id': user_id, 'name': data['name'], 'email': data['email']}
        conn.close()
        return jsonify(result), 201
    
    except sqlite3.IntegrityError:
        conn.rollback()
        conn.close()
        return jsonify({'error': 'Email já cadastrado'}), 409
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

# Rota para atualizar o status de um exercício
@app.route('/api/exercise/<int:user_id>/<exercise_type>', methods=['PUT'])
@require_auth
def update_exercise(user_id, exercise_type):
    data = request.json
    
    if not data:
        return jsonify({'error': 'Dados incompletos'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Verificar se o exercício existe
        cursor.execute(
            'SELECT id FROM exercises WHERE user_id = ? AND exercise_type = ?',
            (user_id, exercise_type)
        )
        exercise = cursor.fetchone()
        
        if not exercise:
            conn.close()
            return jsonify({'error': 'Exercício não encontrado'}), 404
        
        # Atualizar o exercício
        cursor.execute(
            'UPDATE exercises SET status = ?, time_spent = time_spent + ?, last_activity = CURRENT_TIMESTAMP, data = ? WHERE user_id = ? AND exercise_type = ?',
            (data.get('status', 'in-progress'), data.get('timeSpent', 0), json.dumps(data.get('data', {})), user_id, exercise_type)
        )
        
        # Registrar atividade no histórico
        if 'status' in data and data['status'] == 'completed':
            cursor.execute(
                'INSERT INTO activity_history (user_id, title, activity_type, duration) VALUES (?, ?, ?, ?)',
                (user_id, f'Concluiu: {get_exercise_name(exercise_type)}', 'exercise', data.get('timeSpent', 0))
            )
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

# Rota para atualizar o status de um dia de treinamento
@app.route('/api/training-day/<int:user_id>/<int:day_number>', methods=['PUT'])
def update_training_day(user_id, day_number):
    data = request.json
    
    if not data:
        return jsonify({'error': 'Dados incompletos'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Verificar se o dia de treinamento existe
        cursor.execute(
            'SELECT id FROM training_days WHERE user_id = ? AND day_number = ?',
            (user_id, day_number)
        )
        training_day = cursor.fetchone()
        
        if not training_day:
            conn.close()
            return jsonify({'error': 'Dia de treinamento não encontrado'}), 404
        
        # Atualizar o dia de treinamento
        cursor.execute(
            'UPDATE training_days SET status = ?, time_spent = time_spent + ?, last_activity = CURRENT_TIMESTAMP WHERE user_id = ? AND day_number = ?',
            (data.get('status', 'in-progress'), data.get('timeSpent', 0), user_id, day_number)
        )
        
        # Registrar atividade no histórico
        if 'status' in data and data['status'] == 'completed':
            cursor.execute(
                'INSERT INTO activity_history (user_id, title, activity_type, duration) VALUES (?, ?, ?, ?)',
                (user_id, f'Concluiu: Dia {day_number} do Plano de Treino', 'training', data.get('timeSpent', 0))
            )
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

# Rota para gerar relatório PDF
@app.route('/api/report/<int:user_id>', methods=['GET'])
def generate_report(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Obter dados do usuário
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    # Obter exercícios do usuário
    cursor.execute('SELECT * FROM exercises WHERE user_id = ?', (user_id,))
    exercises = cursor.fetchall()
    
    # Obter dias de treinamento do usuário
    cursor.execute('SELECT * FROM training_days WHERE user_id = ?', (user_id,))
    training_days = cursor.fetchall()
    
    # Calcular tempo total gasto
    cursor.execute('SELECT SUM(time_spent) FROM exercises WHERE user_id = ?', (user_id,))
    exercises_time = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT SUM(time_spent) FROM training_days WHERE user_id = ?', (user_id,))
    training_days_time = cursor.fetchone()[0] or 0
    
    total_time_spent = exercises_time + training_days_time
    
    # Gerar gráficos para o relatório
    generate_progress_charts(user_id)
    
    # Gerar o PDF
    pdf_path = os.path.join(DATA_DIR, f'relatorio_usuario_{user_id}.pdf')
    generate_pdf_report(pdf_path, user, exercises, training_days, total_time_spent)
    
    conn.close()
    return send_file(pdf_path, as_attachment=True)

# Função para gerar gráficos de progresso
def generate_progress_charts(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Obter dados de exercícios
    cursor.execute('SELECT exercise_type, status, time_spent FROM exercises WHERE user_id = ?', (user_id,))
    exercises = cursor.fetchall()
    
    # Obter dados de dias de treinamento
    cursor.execute('SELECT day_number, status, time_spent FROM training_days WHERE user_id = ?', (user_id,))
    training_days = cursor.fetchall()
    
    conn.close()
    
    # Preparar dados para gráficos
    exercise_status = {'completed': 0, 'in-progress': 0, 'not-started': 0}
    for exercise in exercises:
        exercise_status[exercise['status']] += 1
    
    training_status = {'completed': 0, 'in-progress': 0, 'not-started': 0}
    for day in training_days:
        training_status[day['status']] += 1
    
    # Gráfico de status dos exercícios
    plt.figure(figsize=(8, 4))
    plt.pie(
        [exercise_status['completed'], exercise_status['in-progress'], exercise_status['not-started']],
        labels=['Concluído', 'Em andamento', 'Não iniciado'],
        autopct='%1.1f%%',
        colors=['#48BB78', '#ECC94B', '#F56565']
    )
    plt.title('Status dos Exercícios')
    plt.savefig(os.path.join(DATA_DIR, 'exercises_status.png'))
    plt.close()
    
    # Gráfico de status dos dias de treinamento
    plt.figure(figsize=(8, 4))
    plt.pie(
        [training_status['completed'], training_status['in-progress'], training_status['not-started']],
        labels=['Concluído', 'Em andamento', 'Não iniciado'],
        autopct='%1.1f%%',
        colors=['#48BB78', '#ECC94B', '#F56565']
    )
    plt.title('Status dos Dias de Treinamento')
    plt.savefig(os.path.join(DATA_DIR, 'training_days_status.png'))
    plt.close()
    
    # Gráfico de tempo gasto por exercício
    exercise_names = [get_exercise_name(ex['exercise_type']) for ex in exercises]
    exercise_times = [ex['time_spent'] for ex in exercises]
    
    plt.figure(figsize=(10, 6))
    bars = plt.bar(exercise_names, exercise_times)
    plt.xticks(rotation=45, ha='right')
    plt.title('Tempo Gasto por Exercício (minutos)')
    plt.tight_layout()
    
    # Adicionar valores acima das barras
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                 f'{height}',
                 ha='center', va='bottom')
    
    plt.savefig(os.path.join(DATA_DIR, 'exercise_time.png'))
    plt.close()

# Função para gerar relatório PDF
def generate_pdf_report(pdf_path, user, exercises, training_days, total_time_spent):
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []
    
    # Título
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Title'],
        fontSize=18,
        alignment=1,
        spaceAfter=12
    )
    elements.append(Paragraph('Relatório de Progresso - Treinamento em Negociação', title_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # Informações do usuário
    elements.append(Paragraph(f'Usuário: {user["name"]}', styles['Heading2']))
    elements.append(Paragraph(f'Email: {user["email"]}', styles['Normal']))
    elements.append(Paragraph(f'Data do relatório: {datetime.datetime.now().strftime("%d/%m/%Y")}', styles['Normal']))
    elements.append(Spacer(1, 0.25*inch))
    
    # Resumo de progresso
    elements.append(Paragraph('Resumo de Progresso', styles['Heading2']))
    
    completed_exercises = sum(1 for ex in exercises if ex['status'] == 'completed')
    completed_days = sum(1 for day in training_days if day['status'] == 'completed')
    
    hours = total_time_spent // 60
    minutes = total_time_spent % 60
    
    summary_data = [
        ['Métrica', 'Valor'],
        ['Exercícios Concluídos', f'{completed_exercises}/10'],
        ['Dias de Treino Concluídos', f'{completed_days}/14'],
        ['Tempo Total de Prática', f'{hours}h {minutes}m']
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.purple),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (1, 0), 12),
        ('BACKGROUND', (0, 1), (1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 0.5*inch))
    
    # Detalhes dos exercícios
    elements.append(Paragraph('Detalhes dos Exercícios', styles['Heading2']))
    
    exercise_data = [['Exercício', 'Status', 'Tempo Gasto']]
    for ex in exercises:
        status_text = 'Concluído' if ex['status'] == 'completed' else 'Em andamento' if ex['status'] == 'in-progress' else 'Não iniciado'
        time_spent = f'{ex["time_spent"]} min' if ex['time_spent'] > 0 else '-'
        exercise_data.append([get_exercise_name(ex['exercise_type']), status_text, time_spent])
    
    exercise_table = Table(exercise_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
    exercise_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (2, 0), colors.purple),
        ('TEXTCOLOR', (0, 0), (2, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (2, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (2, 0), 12),
        ('BOTTOMPADDING', (0, 0), (2, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(exercise_table)
    elements.append(Spacer(1, 0.5*inch))
    
    # Adicionar gráficos
    elements.append(Paragraph('Gráficos de Progresso', styles['Heading2']))
    
    # Verificar se os gráficos existem
    exercises_chart_path = os.path.join(DATA_DIR, 'exercises_status.png')
    training_days_chart_path = os.path.join(DATA_DIR, 'training_days_status.png')
    exercise_time_chart_path = os.path.join(DATA_DIR, 'exercise_time.png')
    
    if os.path.exists(exercises_chart_path):
        elements.append(Paragraph('Status dos Exercícios', styles['Heading3']))
        elements.append(Image(exercises_chart_path, width=6*inch, height=3*inch))
        elements.append(Spacer(1, 0.25*inch))
    
    if os.path.exists(training_days_chart_path):
        elements.append(Paragraph('Status dos Dias de Treinamento', styles['Heading3']))
        elements.append(Image(training_days_chart_path, width=6*inch, height=3*inch))
        elements.append(Spacer(1, 0.25*inch))
    
    if os.path.exists(exercise_time_chart_path):
        elements.append(Paragraph('Tempo Gasto por Exercício', styles['Heading3']))
        elements.append(Image(exercise_time_chart_path, width=7*inch, height=4*inch))
    
    # Gerar o PDF
    doc.build(elements)

# Função para obter o nome de um exercício pelo ID
def get_exercise_name(exercise_id):
    exercise_names = {
        'batna': 'Mapa BATNA',
        'meso': 'MESO - Pacotes Equivalentes',
        'concessoes': 'Concessões Estratégicas',
        'spin': 'Role-play SPIN',
        'ancora': 'Defesa de Âncora Extrema',
        'email': 'E-mail de Síntese',
        'gravacao': 'Gravação de Aberturas',
        'taticas': 'Log de Táticas',
        'framing': 'Framing',
        'pos': 'Pós-Negociação'
    }
    
    return exercise_names.get(exercise_id, 'Exercício Desconhecido')

# Iniciar o servidor se este arquivo for executado diretamente
if __name__ == '__main__':
    app.run(debug=True, port=5000)
