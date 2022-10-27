{{#each licenses as | license |}}
# {{license.main.name}} ({{license.main.licenses}})

{{#each license.packages as | package |}}
## [{{package.name}}]({{package.repository}})
```
{{package.licenseContents}}
```

{{else}}
_No external licenses are used with this project_
{{/each}}

{{/each}}
