# Push checklist (everyone, before each push to `main`)

1. `git pull --no-rebase origin main` (a merge, never a rebase). Resolve nothing outside your lane; ask the owner.
2. Run your lane's tests. With Node: `node --test tests/report tests/runtime`. Browser pages: `powershell -ExecutionPolicy Bypass -File runner\run-tests.ps1`.
3. Open the page you changed from `file://`.
4. **Public repo hygiene**: the repository is public. Check the diff for real names, personal emails, customer data, real recordings, secrets or product code. All data stays synthetic.
5. Line endings: `.gitattributes` sets LF. Do not commit mass line-ending changes.
6. `main` must always open and run.
