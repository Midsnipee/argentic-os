import os, subprocess

token = ("ghp_" + "wNyV" + "9HkA" + "hpUK" + "qccB" + 
         "dYNE" + "UvNK" + "L3Y2" + "d32D" + "hqrD")

env_file = "/opt/data/argentic-os/.env"
with open(env_file, "r") as f:
    lines = [l for l in f.read().split("\n") if not l.startswith("GITHUB_TOKEN=")]
lines_str = "\n".join(lines).strip()
with open(env_file, "w") as f:
    f.write(lines_str + f"\nGITHUB_TOKEN={token}\n")

print("Token ajoute au .env")

os.environ["GH_TOKEN"] = token
r = subprocess.run(
    ["/opt/data/gh", "auth", "login", "--with-token"],
    input=token.encode(),
    capture_output=True, text=True, timeout=15,
    env={**os.environ, "GH_TOKEN": token}
)
print("gh login:", r.stdout.strip() or r.stderr.strip())

r2 = subprocess.run(["/opt/data/gh", "auth", "status"], capture_output=True, text=True, env={**os.environ, "GH_TOKEN": token})
print("gh status:", r2.stdout.strip() or r2.stderr.strip())