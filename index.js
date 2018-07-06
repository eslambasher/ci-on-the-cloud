const express = require('express');
const app = express();
var fs = require('fs');
const bodyParser = require('body-parser');
const Compute = require('@google-cloud/compute');
const http = require('http');
const Datastore = require('@google-cloud/datastore');
const projectId = 'ci-on-the-cloud';
const datastore = new Datastore({projectId : projectId});
const PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

addProject = (project) => {
    const projectKey = datastore.key(['Project', project.projectName + "-" + project.projectID]);
    const entity = {
      key: projectKey,
      data: [
        {
          name: 'project_created',
          value: new Date().toJSON(),
        },
        {
          name: 'name',
          value: project.projectName,
          excludeFromIndexes: true,
        },
        {
          name: 'projectUrl',
          value: project.projectUrl,
        },
        {
          name: "ownerName",
          value: project.ownerName,
        },
        {
          name : "projectID",
          value : project.projectID,
        },
        {
          name : "language",
          value : project.language,
        }
      ],
    };
    datastore.save(entity).then(() => {
      console.log(projectKey);
    }).catch(err => {
      console.error('ERROR: ', err);
    });
 }

updateProject = (newProject) => {
  const transaction = datastore.transaction();
  const taskKey = datastore.key(['Task', taskId]);

  transaction.run().then(() => transaction.get(taskKey)).then(results => {
      const task = results[0];
      task.done = true;
      transaction.save({key: taskKey,data: task,});
      return transaction.commit();
    }).then(() => {
      console.log(`Task ${taskId} updated successfully.`);
    }).catch(() => transaction.rollback());
 }

checkIsProjectReady = (ip, resposnse) => {
   let waiting = true;
   console.log("Test if instance is ready ...");
   const timer = setInterval(ip => {
   http.get('http://' + ip + ':9001', res => {
           const statusCode = res.statusCode;
           if (statusCode === 200 && waiting) {
             waiting = false;
             clearTimeout(timer);
             // HTTP server is ready.
             console.log('Ready! ip => ' + ip);
           }
         }).on('error', () => {
           // HTTP server is not ready yet.
           process.stdout.write('.');
         });
     },2000,ip);
 }

getConfigPhp = (token, projectUrl, projectName, file) => {
  console.log("Php Project .....");
  return new Promise(resolve => {
     resolve({
       os: 'debian',
       http: true,
       metadata: {
         items: [
           {
             key: 'startup-script',
             value: `#! /bin/bash
             echo "LAMP installation ..."
             apt-get update -yqq
             apt-get install git mysql-server mysql-client php php-mysql php-mbstring libapache2-mod-php php-xml  -y
             /etc/init.d/apache2 stop
             echo "node installtion ... "
             mkdir /opt/nodejs
             curl https://nodejs.org/dist/v8.11.3/node-v8.11.3-linux-x64.tar.gz | tar xvzf - -C /opt/nodejs --strip-components=1
             ln -s /opt/nodejs/bin/node /usr/bin/node
             ln -s /opt/nodejs/bin/npm /usr/bin/npm
             npm i frontail -g
             ln -s /opt/nodejs/bin/frontail /usr/bin/frontail
             echo "Frontail server is running on 9001 port"
             frontail /var/log/syslog &
             echo "composer installtion ... "
             curl -sS https://getcomposer.org/installer | sudo php
             mv composer.phar /usr/local/bin/composer
             ln -s /usr/local/bin/composer /usr/bin/composer
             echo "Git project .."
             git clone https://` + token + `@github.com/` + projectUrl + `.git
             cd ` + projectName + `
             echo "Composer installation ..."
             composer install
             echo "Generate key for Laravel project ..."
             php artisan key:generate
             echo "Create database (name : testDataBase).. !"
             echo "create database testDataBase" | mysql -u root --password=""
             echo "Migrate seed for database ..."
             php artisan migrate --seed
             echo "Vendor to publish filemanager ..."
             php artisan vendor:publish
             if [ -f ./package.json ]; then
                echo "NPM installation pacakges .../"
                npm installe
                echo "Test npm packages ..."
                npm test
             fi
             echo "Run tests ..."
             ./vendor/bin/phpunit
             echo "Run project on 80 port ..."
             export address="$(ip addr | grep 'state UP' -A2 | tail -n1 | awk '{print $2}' | cut -f1  -d'/')"
             php artisan serve --port 80 --host $address`,
           },
         ],
       }
     });
   })
 }

getConfigJava= (token, projectUrl, projectName, file) => {
   return new Promise(resolve => {
      resolve({
        os: 'debian',
        http: true,
        metadata: {
          items: [
            {
              key: 'startup-script',
              value: `#!/bin/bash
              apt-get install openjdk-8-jdk-headless adb git libglu1 libpulse0 -y
              apt-get install
              apt-get --quiet update --yes
              apt-get --quiet install --yes wget tar unzip lib32stdc++6 lib32z1
              wget --quiet --output-document=android-sdk.zip https://dl.google.com/android/repository/sdk-tools-linux-3859397.zip
              unzip -q android-sdk.zip -d android-sdk-linux
              chmod -R 777 android-sdk-linux
              echo y | android-sdk-linux/tools/android --silent update sdk --no-ui --all --filter android-25
              echo y | android-sdk-linux/tools/android --silent update sdk --no-ui --all --filter platform-tools
              echo y | android-sdk-linux/tools/android --silent update sdk --no-ui --all --filter build-tools-24.0.0
              echo y | android-sdk-linux/tools/android --silent update sdk --no-ui --all --filter extra-android-m2repository
              echo y | android-sdk-linux/tools/android --silent update sdk --no-ui --all --filter extra-google-google_play_services
              echo y | android-sdk-linux/tools/android --silent update sdk --no-ui --all --filter extra-google-m2repository
              export ANDROID_HOME=$PWD/android-sdk-linux
              export PATH=$PATH:$PWD/android-sdk-linux/platform-tools/
              source /etc/environment
              mkdir android-sdk-linux/licenses
              chmod -R 777 android-sdk-linux
              printf "8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78af6dfcb131a6481e" > android-sdk-linux/licenses/android-sdk-license
              printf "8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78af6dfcb131a6481e" > android-sdk-linux/licenses/android-sdk-license
              chmod -R 777 android-sdk-linux
              yes | android-sdk-linux/tools/bin/sdkmanager --licenses
              mkdir /opt/nodejs
              curl https://nodejs.org/dist/v8.11.3/node-v8.11.3-linux-x64.tar.gz | tar xvzf - -C /opt/nodejs --strip-components=1
              ln -s /opt/nodejs/bin/node /usr/bin/node
              ln -s /opt/nodejs/bin/npm /usr/bin/npm
              npm i frontail -g
              ln -s /opt/nodejs/bin/frontail /usr/bin/frontail
              echo "Frontail server is running on 9001 port"
              frontail /var/log/syslog &
              git clone https://` + token + `@github.com/` + projectUrl + `.git
              cd ` + projectName + `
              chmod -R 777 .
              echo "Build Project JAVA ..."
              ./gradlew assembleDebug
              cd ..
              export ANDROID_SDK_HOME=$PWD/android-sdk-linux
              export ANDROID_HOME=$PWD/android-sdk-linux
              export PATH=$PATH:$PWD/android-sdk-linux/platform-tools/
              source /etc/environment
              sudo wget --quiet --output-document=android-wait-for-emulator https://raw.githubusercontent.com/travis-ci/travis-cookbooks/0f497eb71291b52a703143c5cd63a217c8766dc9/community-cookbooks/android-sdk/files/d\
              efault/android-wait-for-emulator
              sudo chmod 777 android-wait-for-emulator
              ./android-sdk-linux/tools/bin/sdkmanager --update
              ./android-sdk-linux/tools/bin/sdkmanager "system-images;android-25;google_apis;x86"
              sudo echo y | android-sdk-linux/tools/android --silent update sdk --no-ui --all --filter "system-images;android-25;google_apis;x86"
              sudo echo no | android-sdk-linux/tools/android create avd -n test -k "system-images;android-25;google_apis;x86"
              android-sdk-linux/tools/emulator -avd test -no-window -no-audio &
              ./android-wait-for-emulator
              adb shell input keyevent 82
              cd ` + projectName + `
              ./gradlew cAT
              ./gradlew test`,
            },
          ],
        }
      });
    })
  }

getConfigNode = (token, projectUrl, projectName, file) => {
  console.log("Java Script project ..");
  return new Promise(resolve => {
     resolve({
       os: 'debian',
       http: true,
       metadata: {
         items: [
           {
             key: 'startup-script',
             value: `#! /bin/bash
              apt-get update -yqq
              apt-get install -y git expect
              export PORT=80
              mkdir /opt/nodejs
              echo "node installtion ... "
              curl https://nodejs.org/dist/v8.11.3/node-v8.11.3-linux-x64.tar.gz | tar xvzf - -C /opt/nodejs --strip-components=1
              ln -s /opt/nodejs/bin/node /usr/bin/node
              ln -s /opt/nodejs/bin/npm /usr/bin/npm
              npm i frontail -g
              ln -s /opt/nodejs/bin/frontail /usr/bin/frontail
              frontail /var/log/syslog &
              git clone https://` + token + `@github.com/` + projectUrl + `.git
              cd ` + projectName + `
              ls="$(find -name 'package.json')"
              if [ -z "$ls" ] ;then
                  echo "No package.json file found.\nExiting program"
                  exit;
              else
                  echo "Js packager detected."
              fi
              isExpo="$( cat package.json | grep '\"expo\"')"
              if [ -z "$isExpo" ] ;then
                echo "Node project detected ..."
                echo "Installation npm packages ..."
                npm install
                echo "Test project ..."
                npm test
                echo "Run project ..."
                npm start
                exit;
              fi
              echo "Expo project detected."
              echo "Installing Packages ..."
              npm install
              echo "Installing EXPO CLI ..."
              npm install -g exp
              ln -s /opt/nodejs/bin/exp /usr/bin/exp
              echo "Login to expo account ..."
              set timeout -1
              expect <<EOF
              #!/usr/bin/expect -f
              set timeout -1
              spawn exp signin
              match_max 100000
              expect  "Username/Email Address:"
              send -- "test\r"
              expect "Password:"
              send -- "test\r"
              expect eof
EOF
              echo "Starting Expo server "
              exp start --tunnel`,
           },
         ],
       }
     });
   })
 }

app.post('/createProject', async (req, res) => {
  try {
    let language = req.body.language;
    let file = req.body.file ? req.body.file : " ";
    const compute = new Compute();
    const vm = compute.zone('us-central1-f').vm(req.body.projectName.toLowerCase().replace(/\W|_/, '-') + "-" + req.body.projectID);
    const config = language !== "JavaScript" && language !== "Java" ? await getConfigPhp(req.body.token, req.body.projectUrl, req.body.projectName, file)
      : language === "JavaScript" ? await getConfigNode(req.body.token, req.body.projectUrl, req.body.projectName, file)
      : language === "Java" ? await getConfigJava(req.body.token, req.body.projectUrl, req.body.projectName, file)
      : res.send({"Error" : "Can install this type of project !"});
    vm.create(config).then(data => {
        const operation = data[1];
        return operation.promise();
      }).then(() => {
        return vm.getMetadata();
      }).then((data) => {
        let ip = data[0].networkInterfaces[0].accessConfigs[0].natIP;
        addProject(req.body);
        res.send({"ip" : ip});
      }).catch(err => {
        console.log(err);
        res.send({"Error" : err.message});
      });
  } catch (e) {
    console.log(e);
    res.send({"Error" : "server error ... ! :("});
  }
});

app.put('/project', (req, res) => {
  new Compute().zone('us-central1-f').vm(req.body.projectName).getMetadata().then(function(data) {
    const operation = data[0];
    const apiResponse = data[1];
    console.log(operation);
    return operation.promise();
  }).then(() => {
    res.send("We added you script in " + req.body.projectName);
  }).catch((e) => {
    res.send({"Error" : e})
  });

})

app.get('/project/:ownerName', (req, res) => {
    const query = datastore.createQuery('Project').order('project_created');
    datastore.runQuery(query).then(results => {
        const projects = results[0];
        let pro = projects.find((item) => item.name === req.params.ownerName);
        res.send(pro ? pro : {"Error" : "Can't find your project !!"});
    }).catch(err => {
      res.send(err);
    });
})

app.get('/project/:ownerName/:projectID', (req, res) => {
  listVms((err, result) => {
    if (err)
      res.send(err);
   if (result[0].name === req.params.projectID) {
     res.send(results[0]);
   } else
     res.send({"Error" : "Can not found your project"})
  })
})

function listVms(callback) {
  new Compute().zone('us-central1-f').getVMs().then(data => {
      const vms = data[0];
      let results = vms.map(vm => vm.getMetadata());
      return Promise.all(results);
    }).then(res =>
      callback(
        null,
        res.map(data => {
          return {
            ip: data[0]['networkInterfaces'][0]['accessConfigs'] ? data[0]['networkInterfaces'][0]['accessConfigs'][0]['natIP'] : 'no external ip',
            name: data[0].name,
          };
        })
      )).catch(err => callback(err));
}

app.delete('/project/:projectID', (req, res) => {
  deleteVm(req.params.projectID, (err, result) => {
    if (err)
      res.send(err.message);
    deleteProject(req.params.projectID);
    res.send("VM has been deleted !! : " + result);
  })
})

function deleteVm(name, callback) {
  const vm = new Compute().zone('us-central1-f').vm(name);
  vm.delete().then(data => {
      console.log('Deleting ...');
      const operation = data[0];
      return operation.promise();
    }).then(() => {
      // VM deleted
      callback(null, name);
    }).catch(err => callback(err));
}

function deleteProject(projectID) {
  const projectKey = datastore.key(['Project', projectID]);
  datastore.delete(projectKey).then(() => {
      console.log(`Task ${projectKey} deleted successfully.`);
  }).catch(err => {
      console.error('ERROR:', err);
  });
}

let server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

// server.timeout = 3000;
