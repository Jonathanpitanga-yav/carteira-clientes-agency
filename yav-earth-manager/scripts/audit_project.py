#!/usr/bin/env python3
"""
Auditoria de qualidade de tarefas no LiveSEO Earth.
Recebe JSON via stdin com tarefas ATIVAS (para issues) e opcionalmente
tarefas CONCLUÍDAS (para estatísticas gerais).

Uso:
  python audit_project.py < audit_input.json

Formato de entrada:
  {
    "projectCode": "YD101",
    "projectName": "Visconde Autopeças",
    "tasks": [ ... tarefas ativas (WAITING, IN_PROGRESS etc) ... ],
    "tasks_concluidas": [ ... tarefas FINISHED (opcional) ... ]
  }

As tasks em "tasks" geram issues (pontos de melhoria).
As tasks em "tasks_concluidas" só geram estatísticas agregadas (fonte de conhecimento).
"""

import json
import re
import sys

VERBOS_INFINITIVO = {
    "cadastrar", "criar", "validar", "configurar", "revisar", "atualizar",
    "elaborar", "analisar", "corrigir", "planejar", "definir", "testar",
    "implementar", "solicitar", "liberar", "coletar", "acompanhar",
    "inserir", "organizar", "mapear", "estruturar", "avaliar", "monitorar",
    "aplicar", "programar", "enviar", "publicar", "subir", "realizar",
    "contratar", "negociar", "alinhar", "homologar", "importar", "exportar",
    "treinar", "documentar", "gerar", "extrair", "migrar", "integrar",
    "ativar", "desativar", "remover", "ajustar", "otimizar", "melhorar",
    "fazer", "desenvolver", "customizar", "preparar", "iniciar", "finalizar",
    "apresentar", "pagar", "comprar", "contratar", "cancelar",
    "levantar", "publicar", "reajustar", "revisar",
}

PESOS_GRAVIDADE = {"alta": 10, "media": 5, "baixa": 2}

STATUS_ATIVOS = {"WAITING", "IN_PROGRESS", "EM_ANDAMENTO", "EM_ANALISE",
                 "AGUARDANDO_CLIENTE", "AGUARDANDO_TERCEIROS",
                 "AGUARDANDO_APROVACAO", "REVISAO_NECESSARIA", "EM_REVISAO",
                 "BACKLOG", "A_INICIAR", "PARADO"}


def has_canal_prefix(name):
    return bool(re.match(r'^\[.+\]', name.strip()))


def has_verb(name):
    name_without_prefix = re.sub(r'^\[.*?\]\s*', '', name)
    words = name_without_prefix.lower().split()
    return any(v in words for v in VERBOS_INFINITIVO)


def is_empty_description(desc):
    if not desc:
        return True
    cleaned = re.sub(r'<[^>]+>', '', desc).strip()
    return cleaned == ''


def count_type(issues, tipo):
    seen = set()
    for t in issues:
        for i in t['issues']:
            if i['tipo'] == tipo:
                seen.add(t['task_id'])
    return len(seen)


def audit_task(task):
    """Audita uma única tarefa e retorna lista de issues (vazia se OK)"""
    issues = []
    name = (task.get('name') or '').strip()
    status = task.get('status', '')

    if not has_canal_prefix(name):
        issues.append({
            "tipo": "naming_prefixo", "gravidade": "media",
            "msg": f"Nome não começa com [Canal/Pilar]: '{name}'"
        })

    if not has_verb(name):
        issues.append({
            "tipo": "naming_verbo", "gravidade": "media",
            "msg": f"Nome sem verbo no infinitivo: '{name}'"
        })

    if len(name) < 10:
        issues.append({
            "tipo": "naming_curto", "gravidade": "baixa",
            "msg": f"Nome muito curto ({len(name)} chars): '{name}'"
        })

    desc = task.get('description') or ''
    if is_empty_description(desc):
        issues.append({
            "tipo": "descricao", "gravidade": "alta",
            "msg": "Descrição vazia"
        })

    priority = task.get('priority')
    if priority is None:
        issues.append({
            "tipo": "prioridade", "gravidade": "media",
            "msg": "Prioridade não definida"
        })
    elif priority not in (1, 2, 3):
        issues.append({
            "tipo": "prioridade", "gravidade": "media",
            "msg": f"Prioridade inválida: {priority}"
        })

    if not task.get('deadline'):
        issues.append({
            "tipo": "deadline", "gravidade": "baixa",
            "msg": "Sem deadline definido"
        })

    cthr = task.get('cthr')
    if cthr is None:
        issues.append({
            "tipo": "cthr", "gravidade": "baixa",
            "msg": "Carga horária (chtr) não estimada"
        })

    if not task.get('executor'):
        issues.append({
            "tipo": "executor", "gravidade": "alta",
            "msg": "Executor não definido"
        })

    if not task.get('user_name'):
        issues.append({
            "tipo": "responsavel", "gravidade": "media",
            "msg": "Responsável (user_name) não atribuído"
        })

    return issues


def audit_tasks(data):
    """Audita tarefas ativas + opcionais concluídas"""
    project_code = data.get('projectCode', '???')
    project_name = data.get('projectName', '???')

    tasks_ativas = data.get('tasks', [])
    tasks_concluidas = data.get('tasks_concluidas', [])

    # Auditar apenas ativas
    issues = []
    for task in tasks_ativas:
        task_issues = audit_task(task)
        if task_issues:
            issues.append({
                "task_id": task.get('id'),
                "task_name": (task.get('name') or '').strip(),
                "status": task.get('status', ''),
                "issues": task_issues
            })

    # Score baseado apenas nas issues de ativas
    total_weight = sum(
        PESOS_GRAVIDADE.get(i['gravidade'], 5)
        for t in issues
        for i in t['issues']
    )
    score = max(0, min(100, 100 - total_weight))

    if score >= 90:
        nivel = "verde"
    elif score >= 70:
        nivel = "amarelo"
    else:
        nivel = "vermelho"

    # Contagem geral de tarefas concluídas (apenas estatística)
    def gen_stats(task_list):
        result = {'total': len(task_list)}
        if not task_list:
            return result

        total_naming = sum(1 for t in task_list
                           if not has_canal_prefix(t.get('name', ''))
                           or not has_verb(t.get('name', '')))
        total_desc = sum(1 for t in task_list
                         if is_empty_description(t.get('description', '')))
        total_prior = sum(1 for t in task_list
                          if t.get('priority') is None)
        total_deadline = sum(1 for t in task_list
                             if not t.get('deadline'))
        total_cthr = sum(1 for t in task_list
                         if t.get('cthr') is None)
        total_exec = sum(1 for t in task_list
                         if not t.get('executor'))
        total_resp = sum(1 for t in task_list
                         if not t.get('user_name'))

        result.update({
            'naming_inadequado': total_naming,
            'sem_descricao': total_desc,
            'sem_prioridade': total_prior,
            'sem_deadline': total_deadline,
            'sem_cthr': total_cthr,
            'sem_executor': total_exec,
            'sem_responsavel': total_resp,
        })
        return result

    stats_ativas = gen_stats(tasks_ativas)
    stats_concluidas = gen_stats(tasks_concluidas) if tasks_concluidas else None

    result = {
        "projectCode": project_code,
        "projectName": project_name,
        "score": score,
        "nivel": nivel,
        "resumo": {
            "tarefas_ativas": len(tasks_ativas),
            "tarefas_concluidas": len(tasks_concluidas),
            "total_geral": len(tasks_ativas) + len(tasks_concluidas),
            "tarefas_com_issues": len(issues),
        },
        "issues": issues,
        "summary": {
            "sem_descricao": count_type(issues, "descricao"),
            "sem_prioridade": count_type(issues, "prioridade"),
            "sem_deadline": count_type(issues, "deadline"),
            "sem_cthr": count_type(issues, "cthr"),
            "sem_executor": count_type(issues, "executor"),
            "sem_responsavel": count_type(issues, "responsavel"),
            "sem_prefixo_canal": count_type(issues, "naming_prefixo"),
            "sem_verbo": count_type(issues, "naming_verbo"),
            "nome_curto": count_type(issues, "naming_curto"),
        },
        "estatisticas_ativas": stats_ativas,
        "estatisticas_concluidas": stats_concluidas,
    }

    return result


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"Erro ao ler JSON da entrada: {e}",
            "hint": "Forneça JSON via stdin no formato: { projectCode, projectName, tasks: [...] }"
        }))
        sys.exit(1)

    if not isinstance(data, dict) or 'tasks' not in data:
        print(json.dumps({
            "error": "JSON deve conter 'tasks' (lista de tarefas ativas)",
            "received_keys": list(data.keys()) if isinstance(data, dict) else type(data).__name__
        }))
        sys.exit(1)

    result = audit_tasks(data)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
