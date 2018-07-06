#! /bin/bash
echo "node installtion ... "
mkdir /opt/nodejs
curl https://nodejs.org/dist/v8.11.3/node-v8.11.3-linux-x64.tar.gz | tar xvzf - -C /opt/nodejs --strip-components=1
ln -s /opt/nodejs/bin/node /usr/bin/node
ln -s /opt/nodejs/bin/npm /usr/bin/npm
npm i frontail -g
ln -s /opt/nodejs/bin/frontail /usr/bin/frontail
echo "Frontail server is running on 9001 port"
frontail -n 2000 /var/log/syslog
echo "LAMP installation ..."
apt-get update -yqq
apt-get install mysql-server mysql-client apache2 apache2-doc php php-mysql libapache2-mod-php -y
echo "composer installtion ... "
#composer install
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php -r "if (hash_file('SHA384', 'composer-setup.php') === '544e09ee996cdf60ece3804abc52599c22b1f40f4323403c44d44fdfdd586475ca9813a858088ffbc1f233e9b180f061') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
php composer-setup.php
php composer-setup.php --install-dir=/usr/local/bin --filename=composer
echo "Git project .."
git https://github.com/bestmomo/laravel5-example
cd laravel5-example
composer install
php artisan key:generate
php artisan serve --port 8080
