#!/usr/bin/env python

import SimpleHTTPServer
import SocketServer

PORT = 8000

#in case we want to mess with headers
origEndHeaders = None;
def end_headers(self):
	global origEndHeaders
	self.send_header("Access-Control-Allow-Origin", "*")
	origEndHeaders

Handler = SimpleHTTPServer.SimpleHTTPRequestHandler

origEndHeaders = Handler.end_headers

#headers override is currently inactive:
#Handler.end_headers = end_headers

httpd = SocketServer.TCPServer(("", PORT), Handler)

print "serving at port", PORT
httpd.serve_forever()

