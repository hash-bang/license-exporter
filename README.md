@hash-bang/license-exporter
===========================
Export licenses used within a project to various formats.

See this projects [LICENSES.md](./LICENSES.md) file for example `--template=detail` output.


```
Usage: license-exporter [directory/file...]

Options:
  -t, --template <path>  Select a template file to use, either locally or a
                         builtin (default: "simple")
  -o, --output <path>    Output to file (defaults to STDOUT)
  --json                 Output the JSON used in the template before compiling
                         - useful for debugging
  -v, --verbose          Be verbose
  -h, --help             display help for command
```
