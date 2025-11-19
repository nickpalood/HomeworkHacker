## HomeworkHacker

This repository contains a Godot template used for the Human-Agent Interaction assignment. It includes a minimal chatbox agent, example scripts, scenes, and helper assets to get started building an agent that communicates with the OpenAI API.

### Requirements
- Godot 4.4 (or newer)
- The Godot `dotenv` plugin (install from the Godot Asset Library)

### Quick start
- Clone this repository, open it in Godot and import the project.
- Create a `.env` file in the `scripts` directory and set the `API_KEY` variable to your OpenAI API key.
- Edit the system prompt in `_api_client.gd` as needed for your assignment context.
- Set the Main scene and run the project.

### Project Structure (high level)
- `scenes/` — Godot scenes for the example agent and UI
- `scripts/` — Godot script files including `api_client.gd` and `main.gd`
- `addons/` and `assets/` — plugin and image assets used by the project

## GIT CHEAT SHEET (PLAINTEXT)

This is a long practical Git cheat sheet with PowerShell-friendly commands, workflows, troubleshooting (including "not a git repository"), and best practices. Replace placeholders like <file>, <branch>, <remote> with your values.

### QUICK MENTAL CHECKLIST (S-A-C-P)
S — Status: Where am I and what's changed? (git status)
A — Add: Stage changes (git add)
C — Commit: Save snapshot (git commit -m "msg")
P — Push: Upload to remote (git push)

Mnemonic: "Status, Add, Commit, Push"

### BASIC REPO SETUP

Clone existing remote:
git clone https://github.com/username/repo.git
cd repo

Create a new repo from an existing folder:
cd C:\path\to\project
git init
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/username/repo.git
git branch -M main
git push -u origin main

Check whether you're in a git repo:
git rev-parse --is-inside-work-tree
git rev-parse --show-toplevel

If the first command prints "true", you're in a repo. If it errors, you're not.

### COMMON DAILY COMMANDS

Check what changed:
git status -b
git status --porcelain

Stage changes:
git add file.txt
git add path/to/dir/
git add -A
git restore --staged file.txt   (unstage)

Commit:
git commit -m "Short summary line"
git commit -m "Short summary" -m "Longer description paragraph..."

Amend last commit:
git add another-file
git commit --amend --no-edit
git commit --amend -m "New message"

View history:
git log --oneline --graph --decorate -n 50
git log -p file.txt

See differences:
git diff                (unstaged changes)
git diff --staged       (staged vs HEAD)
git diff origin/main..main

Push/pull:
git push origin main
git pull origin main
git pull --rebase origin main

Set upstream when pushing a new branch:
git push -u origin my-branch

Create and switch branches:
git checkout -b feature/awesome
git checkout main
git switch -c feature/awesome
git switch main

List branches:
git branch -a

Delete branch:
git branch -d feature/old
git branch -D feature/old
git push origin --delete feature/old

Stash (temporary save):
git stash save "WIP: quick note"
git stash list
git stash pop
git stash apply
git stash drop

Tags:
git tag -a v1.0 -m "Release 1.0"
git push origin v1.0
git tag

Undo locally (use carefully):
git restore file.txt           (discard unstaged changes)
git restore --staged file.txt  (unstage file)
git reset --soft HEAD~1
git reset --mixed HEAD~1
git reset --hard HEAD~1        (dangerous: discards changes)

Revert commit (safe for public history):
git revert <commit-hash>

Cherry-pick:
git cherry-pick <commit-hash>

Squash commits locally (interactive rebase):
git rebase -i HEAD~3

Bisect (find bad commit):
git bisect start
git bisect bad
git bisect good v1.0
# follow instructions
git bisect reset

Safe merge vs rebase:
Merge keeps a merge commit: git merge main
Rebase rewrites local commits on top: git pull --rebase origin main

### COLLABORATION / REMOTE BASICS

List remotes:
git remote -v

Add or update remote:
git remote add origin https://github.com/user/repo.git
git remote set-url origin git@github.com:user/repo.git

Fetch only:
git fetch origin
git fetch --prune origin

Create PR branch:
git checkout -b feature/desc
git add -A
git commit -m "Add feature"
git push -u origin feature/desc

Sync with remote:
git fetch origin
git checkout main
git merge origin/main
# or:
git pull --rebase origin main

Force push (use carefully):
git push --force-with-lease origin main

### COMMON ERROR MESSAGES AND FIXES

1) fatal: not a git repository (or any of the parent directories): .git
Meaning: no .git folder in current dir or parents.
Fix:
- cd to the repo root or a subfolder of it.
- If you intended to clone: git clone <url>
- If you intended to start a repo: git init; git add -A; git commit -m "Initial commit"
Check:
pwd
ls -Force   (PowerShell shows .git)
git rev-parse --is-inside-work-tree

2) error: failed to push some refs / Updates were rejected because the remote contains work that you do not have locally
Cause: Remote has commits you don't have.
Fix:
git pull --rebase origin main
Resolve conflicts if any, then git push origin main
Or:
git pull origin main
git push origin main

3) credential helper warnings: "git: 'credential-manager-core' is not a git command"
Fix:
Install Git Credential Manager, or set up SSH keys, or:
git config --global credential.helper manager

4) Merge conflicts
Symptoms: Files contain <<<<<<< HEAD; git status shows unmerged paths.
Fix:
Open conflicted files, resolve, then:
git add resolved-file
If merging: git commit
If rebasing: git rebase --continue
To abort:
git merge --abort
git rebase --abort

5) detached HEAD
Fix:
git checkout -b my-branch
or git switch main

6) "permission denied (publickey)"
Fix:
Create SSH key, add to GitHub account, or use HTTPS with token.

### TROUBLESHOOTING QUICK RECIPES

A) If .git deleted but you have remote:
git init
git remote add origin <url>
git fetch origin
git reset --hard origin/main   (careful: replaces files with remote)

B) To revert unpushed local changes completely:
git reset --hard origin/main

C) Back up working tree before destructive ops:
git add -A
git commit -m "WIP backup before X"
# or copy folder elsewhere

D) Preserve both remote and local:
git fetch origin
git checkout -b my-local-copy
git rebase origin/main  # or merge
git push -u origin my-local-copy

### COMMIT MESSAGE GUIDANCE
Format:
Short (50 chars or less) summary, present tense.
Blank line.
Optional body with details.
Examples:
"Fix crash when index is null"
"Add homework parser; support local files and URLs"
Use imperative: "Add", "Fix", "Remove", "Refactor"

### USEFUL ALIASES AND CONFIG (run once)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global core.editor "code --wait"
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm "commit -m"
git config --global pull.rebase true

### POWERHELL-SPECIFIC TIPS
- Use double quotes for commit messages with spaces:
	git commit -m "My commit message"
- In older PowerShell, use ';' to separate commands (not '||' or '&&').
- Inspect .git:
	ls -Force .git
	Get-Content .git\config
- Put multiple commands on separate lines or join with ';'.

### EXAMPLE WORKFLOWS

1) Feature branch -> PR
git checkout -b feature/new-ui
# work, stage, commit many times:
git add -A
git commit -m "Add initial UI layout"
git push -u origin feature/new-ui
# open PR on GitHub

2) Daily update of main
git switch main
git fetch origin
git pull --rebase origin main
git push origin main

3) Sync local repo with remote when remote changed and you have local commits:
git fetch origin
git rebase origin/main
# resolve conflicts, then:
git push origin main

4) Recover from a bad merge:
git merge --abort
git rebase --abort
git reset --hard HEAD

### BEST PRACTICES
- Commit small, focused changes.
- Use feature branches; keep main stable.
- Pull/rebase frequently.
- Add descriptive commit messages.
- Use .gitignore for build/IDE files and secrets.
- Never commit secrets.
- Use --force-with-lease instead of --force if you must rewrite history.

### HANDY ONE-LINERS (POWERSHELL)

Show current branch and last commit:
git rev-parse --abbrev-ref HEAD
git log -1 --oneline

Show changed files since remote main:
git fetch origin
git diff --name-only origin/main..main

Create quick patch:
git diff origin/main..main > my-changes.patch

Stash and switch:
git stash push -m "WIP before switching"
git switch other-branch
git stash pop

### WHEN TO ASK FOR HELP — WHAT TO COPY/PASTE
If asking for help, include:
Output of:
git status -b --porcelain
git log --oneline --graph -n 10
The exact command you ran and the full error messages.

Example to paste:
C:\path\to\repo> git status -b --porcelain
## main...origin/main
 M README.md
?? newfile.txt

### SUGGESTED NEXT ACTIONS I CAN DO FOR YOU
- Create a printable single-file cheat sheet and add it to `GIT-CHEAT-SHEET.txt` or `README.md`.
- Make a small PowerShell script (git-help.ps1) that prints the most-used commands.
- Create helpful git aliases or add the config lines to your global git config.
- Walk you through setting up SSH keys or Git Credential Manager on Windows.

If you want this saved as a plain text file in the repo, tell me the filename and I will add it to the project and commit it for you.
