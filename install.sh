
docker run --name groundstation-nginx --restart always -v ~/uavgroundstation/mime.types:/etc/nginx/mime.types:ro -v ~/uavgroundstation/nginx.conf:/etc/nginx/nginx.conf:ro -v ~/uavgroundstation/html:/usr/share/nginx/html:ro -d -p 8000:80 nginx



