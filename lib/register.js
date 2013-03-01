var express      = require('express'),
    colors       = require('colors'),
    http         = require('http'),
    cproc        = require('child_process'),
    fs           = require('fs');

var register_app = function register_app(app, dirname, script) {
	var log = fs.createWriteStream(dirname + '/soupwhale.log', {
		flags: 'a'
	});

	app.configure(function configure_app() {
		app.use(express.logger({
			stream: log
		}));
		app.use('/assets', express.static(dirname + '/assets'));
		app.use(express.bodyParser());
		app.use(express.cookieParser());
	});
	app.get('/', function(req, res) {
		return res.sendfile(dirname + '/html/index.html');
	});
	app.post('/submit', function(req, res) {
		var key,
		    username, email, invite;
		for(var item in req.body) {
			key = req["body"][item];
			switch(item) {
				case 'username':
					if(key === '' || !/[a-z]/i.test(key) || !/^[a-z]/i.test(key)) {
						return res.status(404).json({
							error: "Username not submitted"
						});
					}
					username = key.trim();
					break;
				case 'email':
					if(key === '') {
						return res.status(404).json({
							error: "Email not submitted"
						});
					}
					email = key.trim();
					break;
				case 'invite':
					if(key === '') {
						return res.status(404).json({
							error: "Invite key not submitted"
						});
					}
					invite = key.trim();
					break;
				default:
					break;
			}
		}
		fs.readFile(dirname + '/soupinvites.db', 'utf8', function(err, data) {
			if(err) {
				res.write(err + '\n');
				return res.end();
			} else {
				data = JSON.parse(data);
				if(Object.keys(data).length === 0) { // Nobody in the DB === nobody has an invite code
					return res.status(500).json({
						error: "Invite key invalid"
					});
				} else {
					var invitee, invites, invited = false;
					for(var user in data) {
						invites = data[user];
						if(invites.indexOf(invite) !== -1) {
							invitee = user;
							invited = true;
							data[user].splice(invites.indexOf(invite), 1);
							break;
						} else {
							continue;
						}
					}
					if(invited) {
						var db = JSON.parse(fs.readFileSync(dirname + '/souprequests.db', 'utf8'));
						if(typeof db[username] === "undefined") {
							db[username] = {
								username: username.trim().toLowerCase(),
								email: email.trim(),
								invitee: invitee
							}
							var dbfile = fs.createWriteStream(dirname + '/souprequests.db'),
							    invitefile = fs.createWriteStream(dirname + '/soupinvites.db');
							dbfile.write(JSON.stringify(db));
							invitefile.write(JSON.stringify(data));
							return res.sendfile(dirname + '/html/okay.html');
							var aus = cproc.spawn(script, [ db[username]["username"] ]);
							aus.on('exit', function(code) {
								return log.write('The add user script `' + ap.opt("add-user-script") + '` exited with a code of ' + code + '\n');
							});
						} else {
							res.json({
								error: "Already invited"
							});
						}
					} else {
						res.json({
							error: "Invite key not valid"
						});
					}
				}
			}
		});
	});
	app.get('/*', function(req, res) {
		res.status(404).sendfile(dirname + '/html/404.html');
	});
	app.post('/*', function(req, res) {
		res.status(404).sendfile(dirname + '/html/404.html');	
	});
}
module.exports = register_app;
