import subprocess

sql = "INSERT INTO painel_senha (servico_id, unidade_id, num_senha, sig_senha, msg_senha, local, num_local, peso, prioridade, nome_cliente, documento_cliente) VALUES (82, 6, 17, 'AG', '', 'Guichê', 3, 1, 'Agendamento Web', 'cidadao', '83253860027');"

cmd = [
    "ssh",
    "-i", r"C:\Users\saulo.lima\.ssh\id_ed25519_api_semit",
    "semit@10.15.25.31",
    f"docker exec -i novosga-2210-mysqldb-1 mysql -u novosga -padmin novosga2 -e \"{sql}\""
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)
print("Stdout:", res.stdout)
print("Stderr:", res.stderr)
