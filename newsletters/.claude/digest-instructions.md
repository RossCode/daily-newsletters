# Morning Newsletter Digest: Procedure

This file holds the full logic for Joel's morning newsletter digest. The scheduled task `SKILL.md` (at `c:\users\msn\.claude\scheduled-tasks\daily-newsletter-summarizer\SKILL.md`) handles scheduling and delegates to this file. State for the time window is tracked in `last-run.json` in this same folder.

You are producing a daily morning newsletter digest for Joel. Search his Gmail for emails in the "Newsletters" label received since the last time this digest ran (tracked in the state file, with a 24-hour fallback on the first run), read them, identify overlapping stories (which signal importance), and produce a full digest saved as a Markdown file on his Windows machine.

## Steps

1. **Determine the time window from the last-run state file.** The state file lives at `c:\code\rosscode\newsletters\newsletters\.claude\last-run.json` and records when this digest last ran.
   - First, capture the current time as the new run marker: get the current UTC epoch seconds and matching ISO 8601 string (e.g. PowerShell `[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()` and `[DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")`). Hold onto both values; you will write them back in Step 6. Capture this BEFORE searching so newsletters that arrive mid-run are picked up next time rather than missed.
   - Read the state file. If it exists, use its `last_run_epoch` as the lower bound. If it does not exist (first run) or cannot be parsed, fall back to 24 hours ago.
   - Search the Gmail "Newsletters" label using that lower bound: `label:Newsletters after:<epoch>`. Gmail accepts Unix epoch seconds in the `after:` operator, which is more precise than a calendar date and prevents missed or double-counted newsletters between runs. This label contains only newsletters, so no extra filtering is needed. List the matching message IDs before reading.

2. **Read each newsletter.** For each matching message, fetch and read the full content. Focus on headlines, story summaries, and key topics. Skip promotional and ad copy. As you read, capture the best source URL for each story, preferring the original article link over newsletter tracking links. Strip UTM parameters and tracking tokens from every URL before using it (use `https://techcrunch.com/2026/04/20/some-story/`, not the version with `?utm_source=...`).

3. **Identify overlapping stories.** Note which stories, topics, or people appear across multiple newsletters. A story covered by 2 or more newsletters is significant. Flag it clearly and track the coverage count.

4. **Build the digest content** with this structure:
   - **Top Stories** (covered by multiple newsletters): for each repeated story, write a 2-3 sentence prose summary and note the coverage count, e.g. "(covered in 3 newsletters)". Link the headline to the best source URL.
   - **Also Worth Knowing**: brief one-line bullets for single-newsletter stories worth knowing. Each bullet includes a linked source.
   - **Quick Hits**: a few sentence fragments for minor items, trends, or data points worth a glance. Link inline where a clean URL is available.
   - **Shower Thoughts**: include only if a newsletter contains a Shower Thoughts section.

5. **Write the digest as a Markdown file.** Determine today's date and construct the output path:

   `c:\code\rosscode\newsletters\newsletters\{YYYY}\{MonthName}\{YYYY-MM-DD}.md`

   - `{YYYY}` = 4-digit year (e.g. `2026`)
   - `{MonthName}` = full month name, capitalized (e.g. `June`)
   - `{YYYY-MM-DD}` = zero-padded ISO date (e.g. `2026-06-04`)

   Example: `c:\code\rosscode\newsletters\newsletters\2026\June\2026-06-04.md`

   Create the year/month directory if it does not exist (e.g. `mkdir` via your shell, or have the Write step create parent folders), then write the file directly to the Windows path using the Write tool. No `/mnt/c/` mounting is involved; write to the native Windows path.

   Format the Markdown as follows:
   ```
   # Morning Digest, [Month D, YYYY]

   *[N] newsletters, [N] overlapping stories*

   ---

   ## Top Stories

   ### [Headline](URL)
   *(N newsletters)*

   2-3 sentence summary paragraph.

   ---

   ## Also Worth Knowing

   - **[Headline](URL).** One-line summary.

   ## Quick Hits

   - **Item name:** Brief note. [Link](URL) where available.

   ## Shower Thoughts

   *(Include only if a newsletter contains a Shower Thoughts section)*
   ```

6. **Update the last-run state file.** After the digest file has been written successfully, write the run marker you captured in Step 1 to `c:\code\rosscode\newsletters\newsletters\.claude\last-run.json`:
   ```
   {
     "last_run_utc": "<ISO 8601 UTC, e.g. 2026-06-04T14:17:04Z>",
     "last_run_epoch": <epoch seconds, e.g. 1780582624>
   }
   ```
   Update the file on any successful run, including light days when zero or few newsletters were found, so the window always advances. Do NOT update it if the run failed before producing a digest, otherwise the next run would skip newsletters that were never summarized.

7. **Commit the digest and state together.** Stage and commit the new digest file and the updated `last-run.json` in a single commit, so the run-window state always advances alongside the digest it corresponds to. Run git from the repository root `c:\code\rosscode\newsletters` (the folder containing the `.git` directory; the digest content lives one level down under `newsletters\`). Stage exactly these two paths and nothing else, so unrelated untracked files are never swept in:
   - `newsletters/.claude/last-run.json`
   - `newsletters/{YYYY}/{MonthName}/{YYYY-MM-DD}.md`

   Example:
   ```
   git -C "c:\code\rosscode\newsletters" add -- "newsletters/.claude/last-run.json" "newsletters/2026/June/2026-06-04.md"
   git -C "c:\code\rosscode\newsletters" commit -m "Add 2026-06-04 newsletter digest"
   git -C "c:\code\rosscode\newsletters" push
   ```
   After committing, push to `origin` so the digest and updated state reach the remote. Skip the whole step on a failed run.

8. **Report completion.** Output one line: the full path to the file that was written.

## Constraints
- The digest must be readable in under 5 minutes.
- Do not use em dashes anywhere in the digest content.
- No emojis.
- No bullet-point overload. Use prose for Top Stories, bullets only for the other sections.
- Do not include marketing copy, ads, or promotional offers.
- Prioritize substance: news, analysis, data, and trends over opinion or fluff.
- Strip UTM parameters and tracking tokens from all URLs before embedding them as links.
- If fewer than 3 newsletters are found, note that and summarize what was found.
- If no newsletters are found, still write the file noting it may be a light day.
