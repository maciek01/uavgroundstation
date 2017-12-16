#!/bin/bash
# /etc/init.d/groundstationd

### BEGIN INIT INFO
# Provides:          groundstationd
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Example initscript
# Description:       This service is used to manage drone 
### END INIT INFO


case "$1" in 
    start)
        echo "Starting groundstationd"
        sudo -u pi /home/pi/dronegprs/groundstation/run.sh
        ;;
    stop)
        echo "Stopping roneserverd"
        sudo -u pi killall /usr/bin/python
        ;;
    *)
        echo "Usage: /etc/init.d/groundstationd start|stop"
        exit 1
        ;;
esac

exit 0

