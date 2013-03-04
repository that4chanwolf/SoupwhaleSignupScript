#!/usr/bin/env node
var express      = require('express'),
    colors       = require('colors'),
    ap           = require('argparser').vals("add-user-script").nums("port").nonvals("headless").parse(),
    http         = require('http'),
    fs           = require('fs'),
    path         = require('path'),
    cluster      = require('cluster'),
    readline     = require('readline'),
    code         = require('./lib/code'),
    register_app = require('./lib/register');

var log = fs.createWriteStream(__dirname + '/soupwhale.log', {
	flags: 'a'
});

if(!fs.existsSync(ap.opt("add-user-script"))) {
	console.error("ERROR".red + ": --add-user-script not specified, aborting.");
	process.exit(1);
}

// If we're not the master process, let's spawn an HTTP server!
if(!cluster.isMaster) {
	var port;
	if(!ap.opt("port")) {
		port = 80;
	} else {
		port = Number(ap.opt("port"));
	}
	/*
	 * HERE BE HTTP SHIT
	 */
	var httpServer = express();
	register_app(httpServer, __dirname);
	httpServer.listen(port);
} else {
	/*
	 * HERE BE FORKING SHIT
	 */
	require('os').cpus().forEach(function() {
		cluster.fork();
	});


	if(!!ap.opt("headless")) {
		return; // xX_360_nO_iNtErFaCe_Xx
	}

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
		var db = JSON.parse(fs.readFileSync(__dirname + '/soupinvites.db', 'utf8').trim());
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
				"\t`list` - Lists every person who has been invited\n" +
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
						if(db[item].length !== 0) {
							console.log(item + "\n |");
							db[item].forEach(function(code) {
								console.log(" `-- " + code);
							});
						}
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
			case 'list':
				var db = JSON.parse(fs.readFileSync(__dirname + '/souprequests.db', 'utf8')),
				    current;
				for(var item in db) {
					current = db[item];
					console.log("User: `" + current.username + "`");
					console.log("Email: `"+ current.email + "`");
					console.log("Invitee: `"+ current.invitee + "`");
				}
				rl.prompt();
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
