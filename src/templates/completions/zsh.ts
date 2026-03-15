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
    if [[ -f "$HOME/.config/clawctl/oc-completions.zsh" ]]; then
      source "$HOME/.config/clawctl/oc-completions.zsh"
    fi

    # Refresh stale oc completion cache in background (once per day)
    _${fnName}_maybe_refresh_oc_cache() {
      local cache="$HOME/.config/clawctl/oc-completions.zsh"
      local stale_seconds=86400
      if [[ ! -f "$cache" ]]; then
        ${binName} completions update-oc &>/dev/null &!
      elif command -v python3 &>/dev/null; then
        local mtime now
        mtime=$(python3 -c "import os,sys; print(int(os.path.getmtime(sys.argv[1])))" "$cache" 2>/dev/null)
        now=$(date +%s)
        if [[ -n "$mtime" ]] && (( now - mtime > stale_seconds )); then
          ${binName} completions update-oc &>/dev/null &!
        fi
      fi
    }
    _${fnName}_maybe_refresh_oc_cache

    _${fnName}_openclaw_dispatch() {
      if (( \$+functions[_openclaw_root_completion] )); then
        _openclaw_root_completion
      else
        # Static fallback — top-level commands only
        local -a subcmds
        subcmds=(
          'setup:Initialize configuration and workspace'
          'onboard:Interactive setup wizard'
          'configure:Interactive configuration wizard'
          'config:Non-interactive config helpers'
          'doctor:Health checks and quick fixes'
          'status:Display session health and recent recipients'
          'health:Fetch gateway health information'
          'reset:Reset local configuration and state'
          'uninstall:Uninstall gateway service and local data'
          'update:Update the CLI'
          'gateway:Run or manage the gateway service'
          'logs:Tail gateway file logs'
          'daemon:Legacy alias for gateway service commands'
          'message:Outbound messaging and channel actions'
          'agent:Run a single agent turn via gateway'
          'agents:Manage isolated agents'
          'acp:Run the ACP bridge for IDEs'
          'channels:Manage chat channel accounts'
          'pairing:Approve DM pairing requests'
          'devices:Manage device pairing and tokens'
          'skills:List and inspect available skills'
          'plugins:Manage extensions and configuration'
          'cron:Manage scheduled jobs'
          'webhooks:Set up webhooks'
          'system:System event and heartbeat management'
          'dns:Wide-area discovery DNS helper'
          'memory:Vector search over memory files'
          'docs:Search the live documentation index'
          'node:Run headless node host or manage as service'
          'nodes:Talk to gateway and target paired nodes'
          'browser:Browser control for Chrome/Brave/Edge'
          'models:Manage AI models and authentication'
          'security:Security auditing and configuration'
          'secrets:Manage secrets and references'
          'sessions:List stored conversation sessions'
          'tui:Open terminal UI connected to gateway'
          'qr:QR code functionality'
          'hooks:Manage hooks'
        )
        _describe 'openclaw command' subcmds
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
            completions)
              _arguments '1:shell:(bash zsh update-oc)' '--help[Show help]'
              ;;
          esac
          ;;
      esac
    }

    compdef _${fnName} ${binName}
  ` + "\n"
  );
}
