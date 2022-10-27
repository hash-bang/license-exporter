#!/usr/bin/node

import {dirName} from '@momsfriendlydevco/es6';
import licenseChecker from 'license-checker';
import handlebars from 'handlebars'
import {program} from 'commander';
import fs from 'node:fs';
import fsPath from 'node:path';
import {SaneStream} from './lib/sane-stream.js';

import {inspect} from 'util';

program
	.name('license-exporter')
	.usage('[directory/file...]')
	.option('-t, --template <path>', 'Select a template file to use, either locally or a builtin', 'simple')
	.option('-o, --output <path>', 'Output to file (defaults to STDOUT)')
	.option('--json', 'Output the JSON used in the template before compiling to STDERR - useful for debugging')
	.option('-v, --verbose', 'Be verbose')
	.option('--no-direct', 'Disable looking for direct dependencies only')
	.option('--no-ignore-readme', 'Skip license reading where the license file is the same as the README file')
	.parse(process.argv);

let args = {
	...program.opts(), // Read in regular commander options
	files: program.args, // Add remaining args (files in this case) as its own property
};

let template; // Eventual Handlebars template to compile against
let outputStream = new SaneStream(
	args.output
		? fs.createWriteStream(args.output)
		: process.stdout
);
let stderr = new SaneStream(process.stderr);

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
			return Promise.resolve()
				.then(()=> fs.promises.readFile(
					path.endsWith('package.json')
						? path
						: fsPath.join(path, 'package.json')
				))
				.then(contents => JSON.parse(contents))
				.then(packageSpec => new Promise((resolve, reject) =>
					licenseChecker.init({
						start: path,
					}, (err, packages) =>
						err ? reject(err) : resolve({ // Export to object with path as key
							path,
							main: {}, // Will be populated by the main package data later
							mainSpec: packageSpec,
							packages: Object.entries(packages)
								.map(([name, data]) => ({
									name,
									.../(?<name>^.+)@(?<version>.+?)$/.exec(name).groups,
									...data,
								})),
						})
					)
				));
		}));
	})
	.then(licenses => [...licenses]) // Squash array-of-arrays from Promise.all into one collection
	.then(licenses => Promise.all(
		licenses.map(license => {
			// Move main package data into `.main`, erasing it from the rest at `.packages`
			let mainPkgOffset = license.packages.findIndex(p => p.path == license.path);
			license.main = license.packages.splice(mainPkgOffset, 1).at(0);

			let directDependencies = new Set(Object.keys(license.mainSpec.dependencies));

			return Promise.all( // Read all license content to `.licenseContents` as buffer
				Object.values(license.packages)
					.filter(pkg =>
						!args.direct
						|| directDependencies.has(pkg.name)
					)
					.map(pkg => {
						if ( // Try to read licenseFile?
							pkg.licenseFile // Has a license file
							&& (
								! args.ignoreReadme
								|| fsPath.parse(pkg.licenseFile).name != 'README'
							)
						) {
							return fs.promises.readFile(pkg.licenseFile)
								.then(content => pkg.licenseContents = content)
								.then(()=> pkg);
						} else {
							return pkg;
						}
					})
			)
				.then(packages => license.packages = packages)
				.then(()=> license)
		})
	))
	.then(async (licenses) => {
		let templateData = {
			licenses,
		};

		if (args.json) await stderr.write('DATA:' + inspect(templateData, {depth: null, colors: true}))
		return templateData;
	})
	.then(templateData => {
		return outputStream.write(template(templateData));
	})
	// Catch / End {{{
	.then(()=> process.exit(0))
	.catch(e => {
		console.warn('Error:', e.toString());
		process.exit(1);
	})
	.finally(()=> Promise.all([ // Flush all streams
		outputStream.close(),
		stderr.close(),
	]))
	// }}}
