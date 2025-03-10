#!/usr/bin/env python3
"""
Simple HTTP Server for testing connectivity.
Serves files from the current directory.
"""
import http.server
import socketserver
import os
import sys
import webbrowser
from urllib.parse import urlparse, parse_qs

# Set the port and host
PORT = 8080
HOST = "0.0.0.0"  # Listen on all available interfaces

# Create a simple request handler
class TestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests."""
        # Add CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Serve a simple HTML response
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Python Test Server</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
                .success {{ color: green; font-weight: bold; }}
                .info {{ background-color: #f8f9fa; padding: 10px; border-radius: 4px; }}
            </style>
        </head>
        <body>
            <h1>Server is Running!</h1>
            <p class="success">If you can see this page, the server is working correctly.</p>
            
            <div class="info">
                <h2>Server Information</h2>
                <p>Server: Python {sys.version}</p>
                <p>Host: {HOST}</p>
                <p>Port: {PORT}</p>
                <p>Working Directory: {os.getcwd()}</p>
                <p>Request Path: {self.path}</p>
                <p>Server Time: {self.date_time_string()}</p>
            </div>
        </body>
        </html>
        """
        self.wfile.write(html.encode())

# Set up the server
try:
    with socketserver.TCPServer((HOST, PORT), TestHandler) as httpd:
        print(f"Server started at http://{HOST}:{PORT}")
        print(f"Try accessing:")
        print(f"- http://localhost:{PORT}/")
        print(f"- http://127.0.0.1:{PORT}/")
        print(f"- http://192.168.18.20:{PORT}/ (your IP)")
        print("Press Ctrl+C to stop the server")
        
        # Try to open the browser
        try:
            webbrowser.open(f"http://localhost:{PORT}/")
        except:
            pass
            
        # Start the server
        httpd.serve_forever()
except Exception as e:
    print(f"Error starting server: {e}")