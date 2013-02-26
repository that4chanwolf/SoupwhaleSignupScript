var express  = require('express'),
    colors   = require('colors'),
    http     = require('http'),
    fs       = require('fs'),
    os       = require('os'),
    cluster  = require('cluster'),
    readline = require('readline'),
    cproc    = require('child_process'),
    code     = require('./lib/code');

var log = fs.createWriteStream(__dirname + '/soupwhale.log', {
	flags: 'a'
});

// If we're not the master process, let's spawn an HTTP server!
if(!cluster.isMaster) {
	/*
	 * HERE BE HTTP SHIT
	 */
	var register_app = function register_app(app) {
		app.configure(function configure_app() {
			app.use(express.logger({
				stream: log
			}));
			app.use('/assets', express.static(__dirname + '/assets'));
			app.use(express.bodyParser());
			app.use(express.cookieParser());
		});

		app.get('/', function(req, res) {
			return res.sendfile(__dirname + '/html/index.html');
		});
		app.post('/lel', function(req, res) {
			var key,
			    username, email, invite;
			for(var item in req.body) {
				key = req["body"][item];
				switch(item) {
					case 'username':
						if(key === '') {
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
			fs.readFile(__dirname + '/soupinvites.db', 'utf8', function(err, data) {
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
							var db = JSON.parse(fs.readFileSync(__dirname + '/souprequests.db', 'utf8'));
							if(typeof db[username] === "undefined") {
								db[username] = {
									username: username.trim().toLowerCase(),
									email: email.trim(),
									invitee: invitee
								}
								var dbfile = fs.createWriteStream(__dirname + '/souprequests.db'),
								    invitefile = fs.createWriteStream(__dirname + '/soupinvites.db');
								dbfile.write(JSON.stringify(db));
								invitefile.write(JSON.stringify(data));
								return res.sendfile(__dirname + '/html/okay.html');
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
	}

	var httpServer = express();
	register_app(httpServer);
	httpServer.listen(80);
} else {
	/*
	 * HERE BE FORKING SHIT
	 */
	os.cpus().forEach(function() {
		cluster.fork();
	});

	var db = JSON.parse(fs.readFileSync(__dirname + '/soupinvites.db', 'utf8').trim());

	/*
	 * HERE BE COMMAND LINE SHIT
	 */
	var rl = readline.createInterface(process.stdin, process.stdout, function completer(line) {
		var completions = 'help add generate invites list quit'.split(' '),
		hits = completions.filter(function(c) {
			if (c.indexOf(line) == 0) {
				return c;
			}
		});
		return [hits && hits.length ? hits : completions, line];
	});

	var prompt = "soupwhale".magenta + "> "

	rl.setPrompt(prompt, prompt.stripColors.length);

	rl.on('line', function(line) {
		var command, args;

		args = line.split(" ");

		var command = args.splice(0, 1)[0];

		switch(command) {
			case 'help':
				console.log("Help:\n" +
				"\t`help` - What you're seeing right now\n" +
				"\t`add` - Gives a user invite codes\n" +
				"\t`generate` - Generates a specified ammount of random invite codes for samples\n" +
				"\t`invites` - Lists every user and the invite codes they have\n" +
				"\t`list` - Lists every person who needs an invite\n" +
				"\t`quit` - Exits");
				rl.prompt();
				break;
			case 'generate':
				var arg = Number(args[0]);
				if(Number.isNaN(arg) || !args[0]) {
					console.error("ERROR".red + ": Specified argument is not a number");
				} else {
					for(var i = 0; i < arg; i++) {
						console.log(code.code_generator());
					}
				}
				rl.prompt();
				break;
			case 'invites':
				if(args[0] && db[args[0]]) {
					console.log(args[0] + "\n |");
					db[args[0]].forEach(function(code) {
						console.log(" `-- " + code);
					});
				} else {
					for(var item in db) {
						console.log(item + "\n |");
						db[item].forEach(function(code) {
							console.log(" `-- " + code);
						});
					}
				}
				rl.prompt();
				break;
			case 'add':
				if(!args[0] || !args[1] || Number.isNaN(args[1])) {
					console.error("ERROR".red + ": Not enough arguments specified");
					rl.prompt();
				} else {
					rl.question("Are you sure you want to give `" + args[0].trim() + "` " + args[1] + " invites? (y/n): ", function(answer) {
						answer = answer[0].toLowerCase();
						if(answer === 'y') {
							for(var i = 0; i < Number(args[1]); i++) {
								if(typeof db[args[0].trim()] === 'undefined') {
									db[args[0].trim()] = [];
								}
								db[args[0].trim()].push(code.code_generator());
							}
							var invitefile = fs.createWriteStream(__dirname + '/soupinvites.db')
							invitefile.write(JSON.stringify(db));
						}
						rl.setPrompt(prompt, prompt.stripColors.length); // Because apparently this is fucking needed. Why? I don't know. I barely understand this shit.
						rl.prompt();
					});
				}
				break;
			case 'remove':
				if(!args[0] || !args[1] || Number.isNaN(args[1])) {
					console.error("ERROR".red + ": Not enough arguments specified");
					rl.prompt();
				} else {
					db[args[0].trim()].splice(0, Number(args[1]));
					if(db[args[0]].length === 0) {
						delete db[args[0]];
					}
					var invitefile = fs.createWriteStream(__dirname + '/soupinvites.db');
					invitefile.write(JSON.stringify(db));
					rl.prompt();
				}
				break;
			case 'quit':
				process.exit(0);
				break;
			default:
				console.error("ERROR".red + ": Command `" + command + "` not implemented");
				rl.prompt();
				break;	
		}
	});

	process.stdin.on('keypress', function(s, key) { // For clearing the screen
		if(typeof key === 'undefined') {
			return;
		} else if(key.ctrl && key.name == 'l') {
			process.stdout.write('\u001B[2J\u001B[0;0f');
			rl.prompt();
		}
	});

	rl.prompt();
}
