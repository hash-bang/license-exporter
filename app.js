#!/usr/bin/node

import {dirName} from '@momsfriendlydevco/es6';
import licenseChecker from 'license-checker';
import handlebars from 'handlebars'
import {program} from 'commander';
import fs from 'node:fs';

import {inspect} from 'util';

program
	.name('license-exporter')
	.usage('[directory/file...]')
	.option('-t, --template <path>', 'Select a template file to use, either locally or a builtin', 'simple')
	.option('-o, --output <path>', 'Output to file (defaults to STDOUT)')
	.option('--json', 'Output the JSON used in the template before compiling - useful for debugging')
	.option('-v, --verbose', 'Be verbose')
	.parse(process.argv);

let args = {
	...program.opts(), // Read in regular commander options
	files: program.args, // Add remaining args (files in this case) as its own property
};

let template; // Eventual Handlebars template to compile against
let outputStream = args.output
	? fs.createWriteStream(args.output)
	: process.stdout;

// Setup handlebars logging via `{{log ...stuff}}` {{{
handlebars.registerHelper('log', (...args) => {
	console.log(`HANDLEBARS LOG:`, ...args);
})
// }}}


Promise.resolve()
	// Sanity checks {{{
	.then(()=> {
		if (!args.files.length) args.files = ['.'];
	})
	.then(()=> fs.promises.readFile(args.template, 'utf-8') // Try reading absolute file path
		.catch(()=> fs.promises.readFile(`${dirName()}/templates/${args.template}.md`, 'utf-8')
			.catch(()=> { throw new Error(`Cannot find template file path or builtin "${args.template}"`) })
		)
	)
	.then(contents => template = handlebars.compile(contents, {

	}))
	// }}}
	.then(()=> {
		return Promise.all(args.files.map(path => {
			if (args.verbose) console.warn('Reading', path);
			return new Promise((resolve, reject) =>
				licenseChecker.init({
					start: path,
				}, (err, packages) =>
					err ? reject(err) : resolve({ // Export to object with path as key
						path,
						main: {}, // Will be populated by the main package data later
						packages: Object.entries(packages)
							.map(([name, data]) => ({
								name,
								...data,
							})),
					})
				)
			);
		}));
	})
	.then(licenses => [...licenses]) // Squash array-of-arrays from Promise.all into one collection
	.then(licenses => Promise.all(
		licenses.map(license => {
			// Move main package data into `.main`, erasing it from the rest at `.packages`
			let mainPkgOffset = license.packages.findIndex(p => p.path == license.path);
			license.main = license.packages.splice(mainPkgOffset, 1).at(0);

			return Promise.all( // Read all license content to `.licenseContents` as buffer
				Object.values(license.packages)
					.map(pkg => fs.promises.readFile(pkg.licenseFile)
						.then(content => pkg.licenseContents = content)
					)
			)
				.then(()=> license)
		})
	))
	.then(licenses => {
		let templateData = {
			licenses,
		};

		if (args.json)
			console.log('DATA', inspect(templateData, {depth: null, colors: true}))

		return new Promise(resolve => // Promisify the .write() function
			outputStream.write(template(templateData, resolve)),
		)
			.then(()=> outputStream.end()) // Flush when done
	})
	// Catch / End {{{
	.then(()=> process.exit(0))
	.catch(e => {
		console.warn('Error:', e.toString());
		process.exit(1);
	})
	// }}}
