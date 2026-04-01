import dedent from "dedent";

const BS = "\\";

export function generateZshCompletion(binName: string): string {
  const fnName = binName.replace(/-/g, "_");
  return (
    dedent`
    #compdef ${binName}

    _${fnName}_instances() {
      local registry="$HOME/.config/clawctl/instances.json"
      if [[ -f "$registry" ]]; then
        local -a instances
        instances=(\${(f)"$(python3 -c "import json,sys; print(chr(10).join(json.load(open(sys.argv[1])).get('instances',{}).keys()))" "$registry" 2>/dev/null)"})
        compadd -a instances
      fi
    }

    # Source cached openclaw completions if available
    typeset -g _${fnName}_oc_cache_mtime=0
    if [[ -f "$HOME/.config/clawctl/oc-completions.zsh" ]]; then
      source "$HOME/.config/clawctl/oc-completions.zsh"
      _${fnName}_oc_cache_mtime=$(python3 -c "import os,sys; print(int(os.path.getmtime(sys.argv[1])))" "$HOME/.config/clawctl/oc-completions.zsh" 2>/dev/null || echo 0)
    fi

    _${fnName}_openclaw_dispatch() {
      local cache="$HOME/.config/clawctl/oc-completions.zsh"
      local stale_seconds=86400

      if ! (( \$+functions[_openclaw_root_completion] )); then
        # No completions loaded — try to source or fetch
        if [[ -f "$cache" ]]; then
          source "$cache"
          _${fnName}_oc_cache_mtime=$(python3 -c "import os,sys; print(int(os.path.getmtime(sys.argv[1])))" "$cache" 2>/dev/null || echo 0)
        else
          # Block and fetch on first use
          ${binName} completions update-oc &>/dev/null
          if [[ -f "$cache" ]]; then
            source "$cache"
            _${fnName}_oc_cache_mtime=$(python3 -c "import os,sys; print(int(os.path.getmtime(sys.argv[1])))" "$cache" 2>/dev/null || echo 0)
          fi
        fi
      else
        # Completions loaded — re-source if file was updated, background refresh if stale
        if [[ -f "$cache" ]] && command -v python3 &>/dev/null; then
          local file_mtime
          file_mtime=$(python3 -c "import os,sys; print(int(os.path.getmtime(sys.argv[1])))" "$cache" 2>/dev/null)
          if [[ -n "$file_mtime" ]]; then
            if (( file_mtime > _${fnName}_oc_cache_mtime )); then
              source "$cache"
              _${fnName}_oc_cache_mtime=\$file_mtime
            fi
            local now=\$(date +%s)
            if (( now - file_mtime > stale_seconds )); then
              ${binName} completions update-oc &>/dev/null &!
            fi
          fi
        fi
      fi

      # Delegate if available
      if (( \$+functions[_openclaw_root_completion] )); then
        _openclaw_root_completion
      fi
    }

    _${fnName}() {
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
        'mount:Manage VM mount points'
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
                '--config[Config file (skips wizard, shows TUI progress)]:config file:_files' ${BS}
                '--plain[Plain log output instead of TUI (for CI/automation)]' ${BS}
                '--help[Show help]'
              ;;
            list)
              _arguments '--help[Show help]'
              ;;
            status|start|stop|restart)
              _arguments ${BS}
                '1:instance name:_${fnName}_instances' ${BS}
                '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${fnName}_instances' ${BS}
                '--help[Show help]'
              ;;
            delete)
              _arguments ${BS}
                '1:instance name:_${fnName}_instances' ${BS}
                '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${fnName}_instances' ${BS}
                '--purge[Also remove the project directory]' ${BS}
                '--help[Show help]'
              ;;
            shell)
              _arguments ${BS}
                '1:instance name:_${fnName}_instances' ${BS}
                '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${fnName}_instances' ${BS}
                '--help[Show help]'
              ;;
            register)
              _arguments ${BS}
                '1:instance name:' ${BS}
                '--project[Path to the project directory]:project dir:_directories' ${BS}
                '--help[Show help]'
              ;;
            openclaw|oc)
              _${fnName}_openclaw_dispatch
              ;;
            use)
              _arguments ${BS}
                '1:instance name:_${fnName}_instances' ${BS}
                '--global[Set global context instead of local .clawctl file]' ${BS}
                '--help[Show help]'
              ;;
            mount)
              local -a mount_commands
              mount_commands=(
                'list:List all mounts for an instance'
                'add:Add a host directory mount to the VM'
                'remove:Remove a mount from the VM'
              )
              if (( CURRENT == 2 )); then
                _describe 'mount command' mount_commands
              else
                case \${words[2]} in
                  list)
                    _arguments ${BS}
                      '1:instance name:_${fnName}_instances' ${BS}
                      '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${fnName}_instances' ${BS}
                      '--help[Show help]'
                    ;;
                  add)
                    _arguments ${BS}
                      '1:host path:_directories' ${BS}
                      '2:guest path:' ${BS}
                      '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${fnName}_instances' ${BS}
                      '--writable[Mount as read-write]' ${BS}
                      '--no-restart[Update config but do not restart the VM]' ${BS}
                      '--help[Show help]'
                    ;;
                  remove)
                    _arguments ${BS}
                      '1:guest path:' ${BS}
                      '(-i --instance)'{-i,--instance}'[Instance to target]:instance name:_${fnName}_instances' ${BS}
                      '--no-restart[Update config but do not restart the VM]' ${BS}
                      '--help[Show help]'
                    ;;
                esac
              fi
              ;;
            completions)
              _arguments '1:shell:(bash zsh)' '--help[Show help]'
              ;;
          esac
          ;;
      esac
    }

    compdef _${fnName} ${binName}
  ` + "\n"
  );
}
