import dedent from "dedent";

const BS = "\\";

export function generateZshCompletion(binName: string): string {
  return (
    dedent`
    #compdef ${binName}

    _${binName}_instances() {
      local registry="$HOME/.config/clawctl/instances.json"
      if [[ -f "$registry" ]]; then
        local -a instances
        instances=(\${(f)"$(python3 -c "import json,sys; print(chr(10).join(json.load(open(sys.argv[1])).get('instances',{}).keys()))" "$registry" 2>/dev/null)"})
        compadd -a instances
      fi
    }

    _${binName}_openclaw_subcommands() {
      local -a subcmds
      subcmds=(
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
      _describe 'openclaw command' subcmds
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

      local state

      # Stop completing after --
      local i
      for (( i=2; i < CURRENT; i++ )); do
        if [[ "\${words[i]}" == "--" ]]; then
          _normal
          return
        fi
      done

      _arguments -C ${BS}
        '1:command:->cmd' ${BS}
        '*:: :->args'

      case \$state in
        cmd)
          _describe 'command' commands
          ;;
        args)
          case \${words[1]} in
            create)
              _arguments ${BS}
                '--config[Config file for headless mode]:config file:_files' ${BS}
                '--help[Show help]'
              ;;
            list)
              _arguments '--help[Show help]'
              ;;
            status|start|stop|restart)
              _arguments ${BS}
                '1:instance name:_${binName}_instances' ${BS}
                '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${binName}_instances' ${BS}
                '--help[Show help]'
              ;;
            delete)
              _arguments ${BS}
                '1:instance name:_${binName}_instances' ${BS}
                '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${binName}_instances' ${BS}
                '--purge[Also remove the project directory]' ${BS}
                '--help[Show help]'
              ;;
            shell)
              _arguments ${BS}
                '1:instance name:_${binName}_instances' ${BS}
                '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${binName}_instances' ${BS}
                '--help[Show help]'
              ;;
            register)
              _arguments ${BS}
                '1:instance name:' ${BS}
                '--project[Path to the project directory]:project dir:_directories' ${BS}
                '--help[Show help]'
              ;;
            openclaw|oc)
              _arguments ${BS}
                '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${binName}_instances' ${BS}
                '1:subcommand:_${binName}_openclaw_subcommands' ${BS}
                '--help[Show help]'
              ;;
            use)
              _arguments ${BS}
                '1:instance name:_${binName}_instances' ${BS}
                '--global[Set global context instead of local .clawctl file]' ${BS}
                '--help[Show help]'
              ;;
            completions)
              _arguments '1:shell:(bash zsh)' '--help[Show help]'
              ;;
          esac
          ;;
      esac
    }

    compdef _${binName} ${binName}
  ` + "\n"
  );
}
