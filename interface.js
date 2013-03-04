#!/usr/bin/env node
var fs           = require('fs'),
    readline     = require('readline'),
    code         = require('./lib/code'),
    colors       = require('colors'),
    cproc        = require('child_process'),
    path         = require('path'),
    ap           = require('argparser').vals("add-user-script").parse();

if(!fs.existsSync(ap.opt("add-user-script"))) {
	console.error("ERROR".red + ": --add-user-script not specified, aborting.");
	process.exit(1);
}

/*
 * HERE BE COMMAND LINE SHIT
 */
var rl = readline.createInterface(process.stdin, process.stdout, function completer(line) {
	var completions = 'help add generate invites list quit accept'.split(' '),
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
			"\t`accept` - Accepts a person into soupwhale\n" +
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
					answer = answer.toLowerCase().trim()[0];
					if(answer === 'y') {
						for(var i = 0; i < Number(args[1]); i++) {
							if(typeof db[args[0].trim()] === 'undefined') {
								db[args[0].trim()] = [];
							}
							db[args[0].trim()].push(code.code_generator());
						}
						var invitefile = fs.createWriteStream(__dirname + '/soupinvites.db')
						invitefile.write(JSON.stringify(db));
						invitefile.end();
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
				invitefile.end();
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
		case 'accept':
			var db = JSON.parse(fs.readFileSync(__dirname + '/souprequests.db', 'utf8'));
			if(db[args[0]]) {
				rl.question("Are you sure you want to accept " + args[0].trim() + " to soupwhale? (y/n): ", function(answer) {
					answer = answer.toLowerCase().trim()[0];
					if(answer === 'y') {
						rl.setPrompt(prompt, prompt.stripColors.length);
						var aus = cproc.spawn(path.resolve(ap.opt("add-user-script")), [ args[0].trim().toLowerCase() ]);
						aus.stdout.on('data', function(data) {
							console.log(data.toString());
						});
						aus.stderr.on('data', function(data) {
							console.error(data.toString());
						});
						aus.on('exit', function(code) {
							console.log('add-user-script exited with a status code of ' + code);
							rl.prompt();
						});
					}
				});
			} else {
				console.error("ERROR".red + ": User " + args[0] + " not in database");
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
