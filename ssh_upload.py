import paramiko
import sys

def upload_file(host, user, password, local_path, remote_path):
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname=host, username=user, password=password, timeout=10)
        sftp = client.open_sftp()
        sftp.put(local_path, remote_path)
        sftp.close()
        client.close()
        print("Upload successful.")
    except Exception as e:
        print(f"Failed to upload: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: ssh_upload.py <host> <user> <pass> <local> <remote>")
        sys.exit(1)
    upload_file(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
