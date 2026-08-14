import http.server
import socketserver
import json
import os

PORT = int(os.environ.get('PORT', 3001))
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")
PROTEINS_FILE = os.path.join(DATA_DIR, "proteins.json")

# Initial mock data if files don't exist
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
        pass  # Log silencioso

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

        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            req_data = json.loads(body) if body else {}
        except Exception:
            req_data = {}

        if self.path == '/api/orders':
            orders = load_json_file(ORDERS_FILE, DEFAULT_ORDERS)
            orders.insert(0, req_data)
            save_json_file(ORDERS_FILE, orders)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "message": "Pedido recebido na cozinha!"}).encode('utf-8'))
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

        if self.path == '/api/proteins':
            proteins = load_json_file(PROTEINS_FILE, DEFAULT_PROTEINS)
            if isinstance(proteins, list):
                proteins.append(req_data)
            save_json_file(PROTEINS_FILE, proteins)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    load_json_file(ORDERS_FILE, DEFAULT_ORDERS)
    load_json_file(PROTEINS_FILE, DEFAULT_PROTEINS)
    os.chdir(DATA_DIR)
    
    with socketserver.TCPServer(("", PORT), DeliveryAppRequestHandler) as httpd:
        print(f"Servidor BC Marmitas rodando em http://localhost:{PORT}")
        httpd.serve_forever()
