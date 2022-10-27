{{#each licenses as | license |}}
# Licenses used in {{license.main.name}} ({{license.main.licenses}})

{{#each license.packages as | package |}}
* [{{package.name}}]({{package.repository}}) ({{package.licenses}})
{{else}}
_No external licenses are used with this project_
{{/each}}

{{/each}}
