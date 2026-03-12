# OID4VCI Metadata Versioning Design

## Problem

The current issuer metadata served from `/.well-known/openid-credential-issuer` mixes two OID4VCI metadata drafts in one response:

- Draft 13 style `credential_configurations_supported`
- legacy Draft 11 style `credentials_supported`

At the same time, the credential offer uses Draft 13 style `credential_configuration_ids`.

Some wallets classify the metadata version by checking for `credentials_supported`. When that legacy field is present, they switch to Draft 11 parsing and fail to resolve the offered credential ID from the Draft 13 offer. That produces errors such as:

- `Resolved an empty list of offered credentials`

## Goals

- make the default well-known issuer metadata pure Draft 13
- preserve a separate legacy Draft 11 metadata shape for older wallets
- keep the existing Draft 13 offer format unchanged
- make the draft split explicit in code and routing

## Non-Goals

- redesign the OID4VCI offer payload
- support every wallet draft from one mixed metadata response
- change pickup offer or token behavior
- change credential issuance semantics

## Approaches Considered

### 1. Recommended: separate Draft 13 and Draft 11 handlers

Serve pure Draft 13 from the standard well-known endpoint and expose a second explicit legacy endpoint for older wallets.

Pros:

- fixes the current wallet failure
- keeps older compatibility available
- makes the draft boundary explicit and testable

Cons:

- adds one more endpoint to document

### 2. Single endpoint with query parameter versioning

Serve one route with a query such as `?version=draft11`.

Pros:

- smaller route surface

Cons:

- many wallets will only request the standard well-known path
- weak interoperability for real clients

### 3. Environment-based switching

Run the server in only one metadata mode at a time.

Pros:

- simple implementation

Cons:

- does not support the need to keep old-wallet compatibility available at the same time

## Chosen Approach

Approach 1.

The standard well-known endpoint should become pure Draft 13. Legacy Draft 11 metadata should remain available from a separate explicit endpoint and a distinct controller function.

## Design

### 1. Default Metadata

`GET /.well-known/openid-credential-issuer` should return:

- issuer endpoints
- `credential_configurations_supported`
- no `credentials_supported`

This keeps the main issuer metadata aligned with the Draft 13 offer shape already used by the service.

### 2. Legacy Metadata

Add a separate legacy handler and route, for example:

- `GET /.well-known/openid-credential-issuer-draft11`

This response should keep:

- issuer endpoints
- `credentials_supported`

It should not be mixed into the default response.

### 3. Code Structure

The controller should stop building one mixed JSON object inline. Instead it should expose distinct builders or handlers for:

- Draft 13 metadata
- Draft 11 metadata

That keeps future wallet-specific adjustments localized and avoids reintroducing mixed metadata by accident.

### 4. Testing

Add focused tests that prove:

- default metadata includes `credential_configurations_supported`
- default metadata omits `credentials_supported`
- legacy metadata includes `credentials_supported`
- both metadata variants still expose the expected credential type information

## Expected Outcome

After this change:

- modern wallets using the default endpoint receive pure Draft 13 metadata
- the current wallet no longer falls into the wrong legacy parsing path
- older wallets can still use a separate Draft 11 metadata endpoint when needed
