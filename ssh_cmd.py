import paramiko
import sys

def run_ssh(host, user, password, cmd):
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname=host, username=user, password=password, timeout=10)
        print(f"Connected to {host}")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out:
            print(out)
        if err:
            print("ERRORS:", err)
        client.close()
    except Exception as e:
        print(f"Failed to connect or execute: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: ssh_cmd.py <host> <user> <pass> <cmd>")
        sys.exit(1)
    run_ssh(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
