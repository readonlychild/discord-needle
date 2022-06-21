<div align="center">
	<h1>
		<sub>
			<a href="#">
				<img
					src="https://raw.githubusercontent.com/MarcusOtter/discord-needle/main/branding/logo-64x64.png"
					height="39"
					width="39"
				/>
			</a>
		</sub>
		Needle
	</h1>
	Needle is a <b><a href="https://discord.com/">Discord</a> bot</b> that helps you declutter your server by creating <a href="https://support.discord.com/hc/en-us/articles/4403205878423-Threads-FAQ">Discord threads</a> automatically.
	<br /><br />
	<a href="https://needle.gg"><img src="https://img.shields.io/badge/🌐_Website-gray?style=for-the-badge" alt="Website" /></a>
	&emsp;
	<a href="https://needle.gg/invite"><img src="https://img.shields.io/badge/💌_Invite%20Needle-gray?style=for-the-badge" alt="Invite Needle" /></a>
	&emsp;
	<a href="https://needle.gg/chat"><img src="https://img.shields.io/badge/🙋_Get%20Support-gray?style=for-the-badge" alt="Get Support" /></a>
</div>

# Fork Commands

## `/tags`

### tags view

Display current thread tags.

### tags clear

Remove all tags from current thread.

### tags add

Add tags to current thread, appends to existing tags.

### tags replace

Replace tags for current thread.

### tags status 

Assign a status to the thread.

### tags stats-top

List top 25 tags (defaults to last 30 days).

## `/archive`

Grabs messages for current thread, saves data into 

### s3Handler.js

an S3 Bucket.

### fsHandler.js

a local folder.

### Notes

- For development (`npm run dev`), folder `/src/handlers/archive/` must be copied over to `/dist/handlers/`.  This because archive handlers are loaded dynamically so the build process does not include the files.

## `/card`

Builds a `card` for the user and includes badges depending on user server roles.



# Self-hosting

The easiest way to start using Needle in your server is to use the hosted instance. [Click here to invite Needle](https://needle.gg/invite) to your Discord server! If you have any questions, feel free to join the [support server](https://needle.gg/chat) and check the [Frequently Asked Questions](https://needle.gg/faq).

## 🛠️ Self-hosting (advanced)

# License
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at
your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
