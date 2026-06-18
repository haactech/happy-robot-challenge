# Postman Package

Import these files into Postman:

- `carrier-sales-api.postman_collection.json`
- `carrier-sales-api.local.postman_environment.json`

## Local Usage

Start the Worker locally:

```sh
npm run dev
```

Select the `Carrier Sales API - Local` environment and run the collection.

Default variables:

- `base_url`: `http://localhost:8787`
- `api_key`: `test-api-key`

For deployed environments, duplicate the environment and replace:

- `base_url` with the deployed Worker URL.
- `api_key` with the Cloudflare Worker `API_KEY` secret value.
