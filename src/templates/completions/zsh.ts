import dedent from "dedent";

export function generateZshCompletion(binName: string): string {
  return (
    dedent`
    #compdef ${binName}
    # zsh completion for ${binName}
    # eval "$(${binName} completions zsh)"

    _${binName}_instances() {
      local registry="$HOME/.config/clawctl/instances.json"
      if [[ -f "$registry" ]]; then
        local instances
        instances=("\${(@f)$(python3 -c "import json,sys; print('\\n'.join(json.load(open(sys.argv[1])).get('instances',{}).keys()))" "$registry" 2>/dev/null)}")
        compadd -a instances
      fi
    }

    _${binName}() {
      local -a commands
      commands=(
        'create:Create a new OpenClaw instance'
        'list:List all instances with live status'
        'status:Show detailed info for an instance'
        'start:Start a stopped instance'
        'stop:Stop a running instance'
        'restart:Restart an instance with health checks'
        'delete:Delete an instance'
        'shell:Shell into an instance VM'
        'register:Register an existing instance'
        'openclaw:Run an openclaw command in the VM'
        'oc:Run an openclaw command in the VM (alias)'
        'use:Set or show the current instance context'
        'completions:Generate shell completion script'
      )

      local -a openclaw_subcommands
      openclaw_subcommands=(
        'onboard:Run OpenClaw onboarding'
        'doctor:Run health checks'
        'config:Manage configuration'
        'daemon:Manage the daemon'
        'telegram:Manage Telegram integration'
        'agent:Manage agents'
        'workspace:Manage workspaces'
        'session:Manage sessions'
        'tool:Manage tools'
        'skill:Manage skills'
      )

      # Stop completing after --
      local i
      for (( i=2; i < CURRENT; i++ )); do
        if [[ "\${words[i]}" == "--" ]]; then
          _normal
          return
        fi
      done

      if (( CURRENT == 2 )); then
        _describe -t commands 'command' commands
        return
      fi

      local cmd="\${words[2]}"

      case "$cmd" in
        create)
          _arguments \\
            '--config[Config file for headless mode]:config file:_files' \\
            '--help[Show help]'
          ;;
        list)
          _arguments '--help[Show help]'
          ;;
        status|start|stop|restart)
          _arguments \\
            '1:instance name:_${binName}_instances' \\
            '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${binName}_instances' \\
            '--help[Show help]'
          ;;
        delete)
          _arguments \\
            '1:instance name:_${binName}_instances' \\
            '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${binName}_instances' \\
            '--purge[Also remove the project directory]' \\
            '--help[Show help]'
          ;;
        shell)
          _arguments \\
            '1:instance name:_${binName}_instances' \\
            '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${binName}_instances' \\
            '--help[Show help]'
          ;;
        register)
          _arguments \\
            '1:instance name:' \\
            '--project[Path to the project directory]:project dir:_directories' \\
            '--help[Show help]'
          ;;
        openclaw|oc)
          _arguments \\
            '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${binName}_instances' \\
            '1:subcommand:_describe -t openclaw-commands "openclaw command" openclaw_subcommands' \\
            '--help[Show help]'
          ;;
        use)
          _arguments \\
            '1:instance name:_${binName}_instances' \\
            '--global[Set global context instead of local .clawctl file]' \\
            '--help[Show help]'
          ;;
        completions)
          _arguments '1:shell:(bash zsh)' '--help[Show help]'
          ;;
      esac
    }

    compdef _${binName} ${binName}
  ` + "\n"
  );
}
