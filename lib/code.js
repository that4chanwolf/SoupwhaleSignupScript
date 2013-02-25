var code = {
	/*
	 * Generates a random 15 character string
	 */
	code_generator: function code_generator() {
		var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
		    len = 11,
		    ncode = '',
		    rnum;
		for(var i = 0; i < len; i++) {
			rnum = Math.floor(Math.random() * chars.length);
			ncode += chars.substring(rnum, rnum+1);
		}
		return ncode;
	}
}

module.exports = code;
