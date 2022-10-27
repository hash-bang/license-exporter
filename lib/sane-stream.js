/**
* Simple wrapper around Stream to promisify various callbacks
*/
export class SaneStream {
	/**
	* SaneStream() constructor
	* @param {Stream} stream The stream to sub-class
	*/
	constructor(stream) {
		this.stream = stream;
	}

	/**
	* Return a promisified wrapper for SaneStream.write()
	* @param {*} [args...] Normal stream write operations
	* @returns {Promise} A promise which resolves when the operation has completed
	*/
	write(...args) {
		return new Promise((resolve, reject) =>
			this.stream.write(...args, err => err ? reject(err) : resolve())
		)
	}
}
