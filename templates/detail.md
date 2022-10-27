{{#each licenses as | license |}}
# {{license.main.name}} ({{license.main.licenses}})

{{#each license.packages as | package |}}
{{#if package.repository}}
## [{{package.name}}]({{package.repository}})
{{#if package.licenseContents}}
```
{{package.licenseContents}}
```
{{/if}}

{{else}}
_No external licenses are used with this project_
{{/if}}
{{/each}}

{{/each}}
