import dedent from "dedent";

export function generateBashCompletion(binName: string): string {
  const fnName = binName.replace(/-/g, "_");
  return (
    dedent`
    _${fnName}_instances() {
      local registry="$HOME/.config/clawctl/instances.json"
      if [[ -f "$registry" ]]; then
        python3 -c "import json,sys; print(chr(10).join(json.load(open(sys.argv[1])).get('instances',{}).keys()))" "$registry" 2>/dev/null
      fi
    }

    # Source cached openclaw completions if available
    _${fnName}_oc_cache_mtime=0
    if [[ -f "$HOME/.config/clawctl/oc-completions.bash" ]]; then
      source "$HOME/.config/clawctl/oc-completions.bash"
      _${fnName}_oc_cache_mtime=$(python3 -c "import os,sys; print(int(os.path.getmtime(sys.argv[1])))" "$HOME/.config/clawctl/oc-completions.bash" 2>/dev/null || echo 0)
    fi

    _${fnName}_openclaw_dispatch() {
      local cache="$HOME/.config/clawctl/oc-completions.bash"
      local stale_seconds=86400

      if ! type _openclaw_completion &>/dev/null; then
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
            local now
            now=\$(date +%s)
            if (( now - file_mtime > stale_seconds )); then
              ${binName} completions update-oc &>/dev/null &
              disown 2>/dev/null
            fi
          fi
        fi
      fi

      # Delegate if available
      if type _openclaw_completion &>/dev/null; then
        local oc_words=("openclaw")
        local j
        for (( j=2; j <= COMP_CWORD; j++ )); do
          oc_words+=("\${COMP_WORDS[j]}")
        done
        local saved_words=("\${COMP_WORDS[@]}")
        local saved_cword=\$COMP_CWORD
        COMP_WORDS=("\${oc_words[@]}")
        (( COMP_CWORD = COMP_CWORD - 1 ))
        _openclaw_completion
        COMP_WORDS=("\${saved_words[@]}")
        COMP_CWORD=\$saved_cword
      fi
    }

    _${fnName}_completions() {
      local cur prev
      cur="\${COMP_WORDS[COMP_CWORD]}"
      prev="\${COMP_WORDS[COMP_CWORD-1]}"

      # Stop completing after --
      local i
      for (( i=1; i < COMP_CWORD; i++ )); do
        if [[ "\${COMP_WORDS[i]}" == "--" ]]; then
          return
        fi
      done

      local commands="create list status start stop restart delete shell register openclaw oc use mount"

      # Complete command name at position 1
      if [[ \$COMP_CWORD -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
        return
      fi

      local cmd="\${COMP_WORDS[1]}"

      case "$cmd" in
        create)
          COMPREPLY=( $(compgen -W "--config --plain --help" -- "$cur") )
          ;;
        list)
          COMPREPLY=( $(compgen -W "--help" -- "$cur") )
          ;;
        status|start|stop|restart)
          case "$prev" in
            -i|--instance)
              COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
              ;;
            *)
              if [[ "$cur" == -* ]]; then
                COMPREPLY=( $(compgen -W "-i --instance --help" -- "$cur") )
              else
                COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
              fi
              ;;
          esac
          ;;
        delete)
          case "$prev" in
            -i|--instance)
              COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
              ;;
            *)
              if [[ "$cur" == -* ]]; then
                COMPREPLY=( $(compgen -W "-i --instance --purge --help" -- "$cur") )
              else
                COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
              fi
              ;;
          esac
          ;;
        shell)
          case "$prev" in
            -i|--instance)
              COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
              ;;
            *)
              if [[ "$cur" == -* ]]; then
                COMPREPLY=( $(compgen -W "-i --instance --help" -- "$cur") )
              else
                COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
              fi
              ;;
          esac
          ;;
        register)
          COMPREPLY=( $(compgen -W "--project --help" -- "$cur") )
          ;;
        openclaw|oc)
          _${fnName}_openclaw_dispatch
          ;;
        use)
          case "$prev" in
            use)
              if [[ "$cur" == -* ]]; then
                COMPREPLY=( $(compgen -W "--global --help" -- "$cur") )
              else
                COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
              fi
              ;;
            *)
              COMPREPLY=( $(compgen -W "--global --help" -- "$cur") )
              ;;
          esac
          ;;
        mount)
          if [[ \$COMP_CWORD -eq 2 ]]; then
            COMPREPLY=( $(compgen -W "list add remove --help" -- "$cur") )
          else
            local sub="\${COMP_WORDS[2]}"
            case "$sub" in
              list)
                case "$prev" in
                  -i|--instance)
                    COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
                    ;;
                  *)
                    if [[ "$cur" == -* ]]; then
                      COMPREPLY=( $(compgen -W "-i --instance --help" -- "$cur") )
                    else
                      COMPREPLY=( $(compgen -W "$(_${fnName}_instances)" -- "$cur") )
                    fi
                    ;;
                esac
                ;;
              add)
                COMPREPLY=( $(compgen -W "-i --instance --writable --no-restart --help" -- "$cur") )
                ;;
              remove)
                COMPREPLY=( $(compgen -W "-i --instance --no-restart --help" -- "$cur") )
                ;;
            esac
          fi
          ;;
        completions)
          COMPREPLY=( $(compgen -W "bash zsh update-oc --help" -- "$cur") )
          ;;
      esac
    }

    complete -F _${fnName}_completions ${binName}
  ` + "\n"
  );
}
