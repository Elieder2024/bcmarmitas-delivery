import http.server
import socketserver
import json
import os
import time

PORT = int(os.environ.get('PORT', 3001))
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")
PROTEINS_FILE = os.path.join(DATA_DIR, "proteins.json")
DRINKS_FILE = os.path.join(DATA_DIR, "drinks.json")
PRICES_FILE = os.path.join(DATA_DIR, "menu_prices.json")
CUSTOMERS_FILE = os.path.join(DATA_DIR, "customers.json")
REWARDS_FILE = os.path.join(DATA_DIR, "rewards.json")
STORE_HOURS_FILE = os.path.join(DATA_DIR, "store_hours.json")

DEFAULT_STORE_HOURS = {
  "manualStatus": "auto",
  "openTime": "11:00",
  "closeTime": "23:00",
  "daysOpen": [0, 1, 2, 3, 4, 5, 6],
  "closedMessage": "🔴 Restaurante Fechado no Momento! Nosso horário de funcionamento é das 11:00 às 23:00. Fique à vontade para olhar nosso cardápio!"
}

DEFAULT_ORDERS = [
  {
    "id": "BC-7810",
    "clientName": "Cliente Centro BC",
    "address": "Av. Brasil, 1500 - Apto 402, Centro (Balneário Camboriú)",
    "items": "1x Marmita Média (Bife de Carne na Chapa) | Bebida: Coca-Cola Lata 350ml",
    "total": 18.00,
    "paymentMethod": "PIX",
    "status": "EM_PREPARO",
    "date": "Hoje, 12:15"
  }
]

DEFAULT_PROTEINS = [
  { "id": "prot_1", "name": "🥩 Bife de Carne na Chapa", "desc": "Carne macia grelhada na hora com tempero da casa" },
  { "id": "prot_2", "name": "🍗 Frango Grelhado", "desc": "Peito de frango suculento grelhado na chapa com ervas" },
  { "id": "prot_3", "name": "🧀 Frango Empanado", "desc": "Frango empanado crocante à Parmegiana com queijo derretido" }
]

DEFAULT_DRINKS = [
  { "id": "drink_1", "name": "🥤 Coca-Cola Lata 350ml", "price": 5.00 },
  { "id": "drink_2", "name": "🍋 Guaraná Antarctica 350ml", "price": 5.00 },
  { "id": "drink_3", "name": "🍊 Suco Del Valle Laranja 300ml", "price": 6.00 },
  { "id": "drink_4", "name": "💧 Água Mineral sem Gás 500ml", "price": 3.00 }
]

DEFAULT_PRICES = {
  "pequena": 11.50,
  "media": 13.00,
  "grande": 15.00
}

DEFAULT_CUSTOMERS = [
  {
    "phone": "47999998888",
    "name": "Cliente Exemplo BC",
    "email": "cliente@bcmarmitas.com.br",
    "password": "123",
    "points": 120,
    "createdAt": "2026-08-13"
  }
]

DEFAULT_REWARDS = [
  { "id": "rew_1", "name": "🥤 Refrigerante Lata Grátis", "points": 50, "desc": "Qualquer refrigerante lata 350ml", "type": "drink", "value": 5.00, "icon": "🥤" },
  { "id": "rew_2", "name": "🍳 Porção Extra de Batata Frita", "points": 80, "desc": "Porção extra crocante de batata frita", "type": "extra", "value": 6.00, "icon": "🍟" },
  { "id": "rew_3", "name": "💰 Cupom de R$ 10,00 de Desconto", "points": 100, "desc": "Desconto de R$ 10,00 no total do pedido", "type": "discount", "value": 10.00, "icon": "🏷️" },
  { "id": "rew_4", "name": "🍱 Marmita Pequena Grátis", "points": 150, "desc": "1x Marmita Pequena com proteína à escolha", "type": "marmita", "value": 11.50, "icon": "🍱" }
]

def load_json_file(filepath, default_data):
    if not os.path.exists(filepath):
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)
        return default_data
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default_data

def save_json_file(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

class DeliveryAppRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Bypass-Tunnel-Reminder', '1')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/orders':
            orders = load_json_file(ORDERS_FILE, DEFAULT_ORDERS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(orders, ensure_ascii=False).encode('utf-8'))
            return

        if self.path == '/api/proteins':
            proteins = load_json_file(PROTEINS_FILE, DEFAULT_PROTEINS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(proteins, ensure_ascii=False).encode('utf-8'))
            return

        if self.path == '/api/drinks':
            drinks = load_json_file(DRINKS_FILE, DEFAULT_DRINKS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(drinks, ensure_ascii=False).encode('utf-8'))
            return

        if self.path == '/api/menu-prices':
            prices = load_json_file(PRICES_FILE, DEFAULT_PRICES)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(prices, ensure_ascii=False).encode('utf-8'))
            return

        if self.path == '/api/customers/list':
            customers = load_json_file(CUSTOMERS_FILE, DEFAULT_CUSTOMERS)
            # Hide passwords for list
            safe_cust = []
            for c in customers:
                safe_cust.append({
                    "phone": c.get("phone"),
                    "name": c.get("name"),
                    "email": c.get("email"),
                    "points": c.get("points", 0),
                    "createdAt": c.get("createdAt", "")
                })
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(safe_cust, ensure_ascii=False).encode('utf-8'))
            return

        if self.path == '/api/store-hours':
            hours = load_json_file(STORE_HOURS_FILE, DEFAULT_STORE_HOURS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(hours, ensure_ascii=False).encode('utf-8'))
            return

        if self.path == '/api/rewards':
            rewards = load_json_file(REWARDS_FILE, DEFAULT_REWARDS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(rewards, ensure_ascii=False).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            req_data = json.loads(body) if body else {}
        except Exception:
            req_data = {}

        # ORDERS (Save order and credit points if phone matches registered customer)
        if self.path == '/api/orders':
            orders = load_json_file(ORDERS_FILE, DEFAULT_ORDERS)
            orders.insert(0, req_data)
            save_json_file(ORDERS_FILE, orders)

            # Credit loyalty points: 1 pt per R$ 1.00 spent
            cust_phone = req_data.get('clientPhone', '').strip()
            total_spent = float(req_data.get('total', 0))
            pts_earned = int(total_spent)

            if cust_phone and pts_earned > 0:
                customers = load_json_file(CUSTOMERS_FILE, DEFAULT_CUSTOMERS)
                for c in customers:
                    if c.get('phone') == cust_phone:
                        c['points'] = c.get('points', 0) + pts_earned
                        save_json_file(CUSTOMERS_FILE, customers)
                        break

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "message": "Pedido recebido!", "pointsEarned": pts_earned}).encode('utf-8'))
            return

        if self.path == '/api/store-hours':
            hours = req_data
            save_json_file(STORE_HOURS_FILE, hours)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "storeHours": hours}, ensure_ascii=False).encode('utf-8'))
            return

        if self.path == '/api/orders/update-status':
            order_id = req_data.get('id')
            new_status = req_data.get('status')
            orders = load_json_file(ORDERS_FILE, DEFAULT_ORDERS)
            for o in orders:
                if o.get('id') == order_id:
                    o['status'] = new_status
                    break
            save_json_file(ORDERS_FILE, orders)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "orders": orders}).encode('utf-8'))
            return

        # CUSTOMER REGISTER
        if self.path == '/api/customers/register':
            phone = str(req_data.get('phone', '')).strip().replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
            name = req_data.get('name', '').strip()
            email = req_data.get('email', '').strip().lower()
            password = req_data.get('password', '').strip()

            if not phone or not name or not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Preencha Nome, WhatsApp e Senha."}).encode('utf-8'))
                return

            customers = load_json_file(CUSTOMERS_FILE, DEFAULT_CUSTOMERS)
            for c in customers:
                if c.get('phone') == phone:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Este número de WhatsApp já possui conta cadastrada."}).encode('utf-8'))
                    return

            new_c = {
                "phone": phone,
                "name": name,
                "email": email,
                "password": password,
                "points": 20, # Bônus de boas-vindas
                "createdAt": time.strftime("%Y-%m-%d")
            }
            customers.append(new_c)
            save_json_file(CUSTOMERS_FILE, customers)

            safe_info = { "phone": new_c["phone"], "name": new_c["name"], "email": new_c["email"], "points": new_c["points"] }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "customer": safe_info, "message": "Conta criada com sucesso! Você ganhou 20 pontos de bônus!"}).encode('utf-8'))
            return

        # CUSTOMER LOGIN
        if self.path == '/api/customers/login':
            phone = str(req_data.get('phone', '')).strip().replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
            password = req_data.get('password', '').strip()

            customers = load_json_file(CUSTOMERS_FILE, DEFAULT_CUSTOMERS)
            found = None
            for c in customers:
                if c.get('phone') == phone and c.get('password') == password:
                    found = c
                    break

            if not found:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "WhatsApp ou senha incorretos."}).encode('utf-8'))
                return

            safe_info = { "phone": found["phone"], "name": found["name"], "email": found["email"], "points": found["points"] }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "customer": safe_info}).encode('utf-8'))
            return

        # CUSTOMER UPDATE POINTS (ADMIN)
        if self.path == '/api/customers/update-points':
            phone = req_data.get('phone')
            new_points = int(req_data.get('points', 0))
            customers = load_json_file(CUSTOMERS_FILE, DEFAULT_CUSTOMERS)
            for c in customers:
                if c.get('phone') == phone:
                    c['points'] = new_points
                    break
            save_json_file(CUSTOMERS_FILE, customers)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))
            return

        # CUSTOMER REDEEM REWARD
        if self.path == '/api/customers/redeem':
            phone = req_data.get('phone')
            points_cost = int(req_data.get('points', 0))
            customers = load_json_file(CUSTOMERS_FILE, DEFAULT_CUSTOMERS)
            cust = None
            for c in customers:
                if c.get('phone') == phone:
                    cust = c
                    break

            if not cust or cust.get('points', 0) < points_cost:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Saldo de pontos insuficiente."}).encode('utf-8'))
                return

            cust['points'] -= points_cost
            save_json_file(CUSTOMERS_FILE, customers)
            safe_info = { "phone": cust["phone"], "name": cust["name"], "email": cust["email"], "points": cust["points"] }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "customer": safe_info}).encode('utf-8'))
            return

        # REWARDS CRUD (ADMIN)
        if self.path == '/api/rewards':
            rewards = load_json_file(REWARDS_FILE, DEFAULT_REWARDS)
            if req_data.get('id'):
                updated = False
                for r in rewards:
                    if r.get('id') == req_data.get('id'):
                        r['name'] = req_data.get('name', r['name'])
                        r['points'] = int(req_data.get('points', r['points']))
                        r['desc'] = req_data.get('desc', r.get('desc', ''))
                        r['value'] = float(req_data.get('value', r.get('value', 0)))
                        r['type'] = req_data.get('type', r.get('type', 'discount'))
                        updated = True
                        break
                if not updated:
                    rewards.append(req_data)
            else:
                req_data['id'] = 'rew_' + str(int(os.urandom(4).hex(), 16))
                rewards.append(req_data)

            save_json_file(REWARDS_FILE, rewards)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "rewards": rewards}).encode('utf-8'))
            return

        if self.path == '/api/rewards/delete':
            rew_id = req_data.get('id')
            rewards = load_json_file(REWARDS_FILE, DEFAULT_REWARDS)
            rewards = [r for r in rewards if r.get('id') != rew_id]
            save_json_file(REWARDS_FILE, rewards)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "rewards": rewards}).encode('utf-8'))
            return

        # PROTEINS
        if self.path == '/api/proteins':
            proteins = load_json_file(PROTEINS_FILE, DEFAULT_PROTEINS)
            if isinstance(proteins, list):
                if req_data.get('id'):
                    updated = False
                    for p in proteins:
                        if p.get('id') == req_data.get('id'):
                            p['name'] = req_data.get('name', p['name'])
                            p['desc'] = req_data.get('desc', p['desc'])
                            updated = True
                            break
                    if not updated:
                        proteins.append(req_data)
                else:
                    req_data['id'] = 'prot_' + str(int(os.urandom(4).hex(), 16))
                    proteins.append(req_data)

            save_json_file(PROTEINS_FILE, proteins)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "proteins": proteins}).encode('utf-8'))
            return

        if self.path == '/api/proteins/delete':
            prot_id = req_data.get('id')
            proteins = load_json_file(PROTEINS_FILE, DEFAULT_PROTEINS)
            proteins = [p for p in proteins if p.get('id') != prot_id]
            save_json_file(PROTEINS_FILE, proteins)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "proteins": proteins}).encode('utf-8'))
            return

        # DRINKS
        if self.path == '/api/drinks':
            drinks = load_json_file(DRINKS_FILE, DEFAULT_DRINKS)
            if req_data.get('id'):
                updated = False
                for d in drinks:
                    if d.get('id') == req_data.get('id'):
                        d['name'] = req_data.get('name', d['name'])
                        d['price'] = float(req_data.get('price', d['price']))
                        updated = True
                        break
                if not updated:
                    drinks.append(req_data)
            else:
                req_data['id'] = 'drink_' + str(int(os.urandom(4).hex(), 16))
                drinks.append(req_data)

            save_json_file(DRINKS_FILE, drinks)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "drinks": drinks}).encode('utf-8'))
            return

        if self.path == '/api/drinks/delete':
            drink_id = req_data.get('id')
            drinks = load_json_file(DRINKS_FILE, DEFAULT_DRINKS)
            drinks = [d for d in drinks if d.get('id') != drink_id]
            save_json_file(DRINKS_FILE, drinks)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "drinks": drinks}).encode('utf-8'))
            return

        # MENU PRICES
        if self.path == '/api/menu-prices':
            prices = load_json_file(PRICES_FILE, DEFAULT_PRICES)
            if 'pequena' in req_data: prices['pequena'] = float(req_data['pequena'])
            if 'media' in req_data: prices['media'] = float(req_data['media'])
            if 'grande' in req_data: prices['grande'] = float(req_data['grande'])
            save_json_file(PRICES_FILE, prices)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "prices": prices}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    load_json_file(ORDERS_FILE, DEFAULT_ORDERS)
    load_json_file(PROTEINS_FILE, DEFAULT_PROTEINS)
    load_json_file(DRINKS_FILE, DEFAULT_DRINKS)
    load_json_file(PRICES_FILE, DEFAULT_PRICES)
    load_json_file(CUSTOMERS_FILE, DEFAULT_CUSTOMERS)
    load_json_file(REWARDS_FILE, DEFAULT_REWARDS)
    os.chdir(DATA_DIR)
    
    with socketserver.TCPServer(("", PORT), DeliveryAppRequestHandler) as httpd:
        print(f"Servidor BC Marmitas rodando em http://localhost:{PORT}")
        httpd.serve_forever()
