# Getting Started with Claude Code

## A Guide for Complete Beginners

---

## WHAT IS CLAUDE CODE?

Claude Code is a terminal application that lets you talk to Claude while it can see and edit your code files. It's like having a developer sitting next to you who can actually make changes.

**Think of it like this:**

- Regular Claude (web): You paste code, Claude suggests changes, you copy-paste back
- Claude Code: Claude sees your files directly and can edit them itself

---

## STEP 1: INSTALL CLAUDE CODE

Open your terminal and run:

```bash
npm install -g @anthropic-ai/claude-code
```

If you don't have npm, you need to install Node.js first from [nodejs.org](https://nodejs.org).

**Verify it worked:**

```bash
claude --version
```

You should see a version number.

---

## STEP 2: SET UP YOUR PROJECT

### Create a new Next.js project:

```bash
npx create-next-app@latest euongelion --typescript --tailwind --app
```

This will ask you some questions. Just press Enter to accept the defaults.

### Go into your project:

```bash
cd euongelion
```

### Add the agent files:

Copy the `.claude` folder from this package into your project:

```bash
# If you unzipped the package to your Downloads folder:
cp -r ~/Downloads/EUONGELION-STARTUP/.claude ./
```

Your project should now look like this:

```
euongelion/
├── .claude/           ← This is new
│   ├── agents/
│   └── skills/
├── app/
├── public/
├── package.json
└── ...
```

---

## STEP 3: START CLAUDE CODE

Make sure you're in your project folder, then:

```bash
claude
```

You'll see something like:

```
Claude Code v1.x.x
Working directory: /Users/you/euongelion
Type a message...
```

**You're now talking to Claude, and Claude can see your project.**

---

## STEP 4: YOUR FIRST COMMANDS

### Start simple:

```
You: What files are in this project?
```

Claude will list your files.

### Read an agent file:

```
You: Read .claude/agents/ARCHITECT.md and tell me what this agent does
```

Claude will read the file and explain.

### Make something:

```
You: Read .claude/agents/ARCHITECT.md, then create a simple homepage in app/page.tsx that says "Welcome to EUONGELION"
```

Claude will:

1. Read the agent file
2. Understand its role
3. Edit app/page.tsx
4. Tell you what it did

---

## STEP 5: RUNNING YOUR PROJECT

In a **separate terminal window** (keep Claude Code running), start your development server:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

Now you can:

1. Ask Claude to make changes
2. See them appear in your browser (it auto-refreshes)

---

## HOW TO USE THE AGENT SYSTEM

### Basic Pattern:

```
You: Read .claude/agents/[AGENT_NAME].md, then [your request]
```

### Examples:

**Building something:**

```
You: Read .claude/agents/ARCHITECT.md, then create the Supabase client files
```

**Styling something:**

```
You: Read .claude/agents/DESIGNER.md, then style the button to match the brand
```

**Writing content:**

```
You: Read .claude/agents/WRITER.md, then write an error message for when the session expires
```

**Planning something:**

```
You: Read .claude/agents/LAUNCHER.md, then create a 2-week content calendar for launch
```

### Switching Agents:

If you've been working with ARCHITECT and need DESIGNER:

```
You: Now read .claude/agents/DESIGNER.md. I need you to style the component we just built.
```

---

## COMMON COMMANDS

### Viewing files:

```
You: Show me the contents of app/page.tsx
```

### Creating files:

```
You: Create a new file components/Button.tsx with a basic button component
```

### Editing files:

```
You: In app/page.tsx, change the heading from "Welcome" to "EUONGELION"
```

### Running terminal commands:

```
You: Run npm install @supabase/supabase-js
```

### Getting help:

```
You: I don't understand what Supabase is. Explain it simply.
```

---

## TIPS FOR BEGINNERS

### 1. Be specific

**Bad:** "Make it better"
**Good:** "Make the button larger, 48px height, with gold background"

### 2. One thing at a time

**Bad:** "Build the whole app"
**Good:** "Build the homepage first"

### 3. Check your work

After Claude makes changes, look at them:

- Check your browser
- Check the file in your code editor
- Ask Claude to explain what it did

### 4. Save your progress

Use git to save checkpoints:

```bash
git add .
git commit -m "Finished the homepage"
```

### 5. It's okay to ask questions

```
You: I don't understand this error: [paste error]
You: What does this code do?
You: Why did you make that choice?
```

---

## TROUBLESHOOTING

### "Claude doesn't know about my agent files"

Make sure you told Claude to read them:

```
You: Read .claude/agents/ARCHITECT.md first
```

### "The terminal command failed"

Copy the error and ask:

```
You: This error happened: [paste error]. What's wrong?
```

### "I messed something up"

If you have git:

```bash
git checkout -- [filename]  # Undo changes to one file
git checkout .               # Undo all changes
```

### "Claude is doing too much"

```
You: Stop. Let's do this step by step.
```

### "Claude is being too verbose"

```
You: Be concise. Just do it, don't explain everything.
```

---

## YOUR FIRST SESSION SCRIPT

Copy and paste these one at a time:

```
1. You: Read .claude/agents/ARCHITECT.md

2. You: What is my current project structure?

3. You: Create a simple landing page in app/page.tsx with:
   - A centered heading "EUONGELION"
   - A subheading "Daily Bread for the cluttered, hungry soul"
   - A button that says "Begin"

4. You: Now read .claude/agents/DESIGNER.md

5. You: Style the page with these colors:
   - Background: #F7F3ED
   - Text: #1A1612
   - Button: gold background (#C19A6B), dark text
```

After each step, check http://localhost:3000 to see the changes.

---

## KEYBOARD SHORTCUTS

In Claude Code terminal:

- `Ctrl+C` — Cancel current operation
- `Ctrl+D` — Exit Claude Code
- Up arrow — Previous command
- `Tab` — Autocomplete (sometimes)

---

## EXITING

To exit Claude Code:

```
You: exit
```

Or press `Ctrl+D`

To stop your dev server (in the other terminal):
Press `Ctrl+C`

---

## WHAT'S NEXT?

1. **Read the main README.md** — Understand the full agent system
2. **Follow QUICK-START.md** — Week-by-week build plan
3. **Experiment** — Try things, break things, learn
4. **Ask for help** — Claude is patient

---

**You've got this. One command at a time.**
