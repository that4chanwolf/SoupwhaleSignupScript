#!/usr/bin/env bash
if [ $(id -u) -gt 0 ]; then
	echo "Must be root"
	exit 1
fi
LUSER=$1
echo "User's name is $LUSER"
echo "Setting $LUSER's quota to 10GB" $LUSER
/usr/sbin/edquota -p defaultquota $LUSER
echo "Making directory /home/$LUSER/www, /var/www/$LUSER..."
mkdir /var/www/$LUSER
mkdir /home/$LUSER/logs
ln -s /var/www/$LUSER /home/$LUSER/www
chown -R $LUSER:$LUSER /var/www/$LUSER /home/$LUSER/logs /home/$LUSER/www
echo "Adding welcome message to .bashrc..."
cat >> /home/$LUSER/.bashrc <<EOF
cat <<HEREDOC
Howdy, $LUSER! Check out www.soupwhale.com for stuff! Point an IRC client at localhost and /join #shells for more stuff! Remove this line from your .bashrc to stop seeing it! If you'd like webhosting, notice that /home/$LUSER/www/index.html points to $LUSER.soupwhale.com/index.html. If you don't want webhosting, delete the www link in your home directory.
HEREDOC
EOF
echo "Adding VirtualHost block to /etc/apache2/sites-enabled/000-default such that\n$LUSER.soupwhale.com/index.html will point to /var/www/$LUSER/index.html..."
cat >> /etc/apache2/sites-enabled/000-default <<EOF
<VirtualHost *:80>
  ServerName $LUSER.soupwhale.com
  DocumentRoot /var/www/$LUSER
  LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\"" combined
#  CustomLog /home/$LUSER/logs/$LUSER.soupwhale.com-access combined
#  ErrorLog /home/$LUSER/logs/$LUSER.soupwhale.com-error
</VirtualHost>
EOF

echo "Adding blank index.html to /home/$LUSER/www/index.html..."
cat >> /home/$LUSER/www/index.html <<EOF
<html>
<body>
foo
</body>
</html>
EOF
echo "Fixing permissions..."
chown $LUSER:$LUSER /home/$LUSER/www/index.html
echo "Restarting webserver..."
/etc/init.d/apache2 reload
echo "Fixing permissions..."
chmod 700 /home/$LUSER
