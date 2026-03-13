import dedent from "dedent";

export function generateBashCompletion(binName: string): string {
  return (
    dedent`
    _${binName}_instances() {
      local registry="$HOME/.config/clawctl/instances.json"
      if [[ -f "$registry" ]]; then
        python3 -c "import json,sys; print(chr(10).join(json.load(open(sys.argv[1])).get('instances',{}).keys()))" "$registry" 2>/dev/null
      fi
    }

    # Source cached openclaw completions if available
    if [[ -f "$HOME/.config/clawctl/oc-completions.bash" ]]; then
      source "$HOME/.config/clawctl/oc-completions.bash"
    fi

    _${binName}_completions() {
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

      local commands="create list status start stop restart delete shell register openclaw oc use"

      local openclaw_subcommands="setup onboard configure config doctor status health reset uninstall update gateway logs daemon message agent agents acp channels pairing devices skills plugins cron webhooks system dns memory docs node nodes browser models security secrets sessions tui qr hooks"

      # Complete command name at position 1
      if [[ \$COMP_CWORD -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
        return
      fi

      local cmd="\${COMP_WORDS[1]}"

      case "$cmd" in
        create)
          COMPREPLY=( $(compgen -W "--config --help" -- "$cur") )
          ;;
        list)
          COMPREPLY=( $(compgen -W "--help" -- "$cur") )
          ;;
        status|start|stop|restart)
          case "$prev" in
            -i|--instance)
              COMPREPLY=( $(compgen -W "$(_${binName}_instances)" -- "$cur") )
              ;;
            *)
              if [[ "$cur" == -* ]]; then
                COMPREPLY=( $(compgen -W "-i --instance --help" -- "$cur") )
              else
                COMPREPLY=( $(compgen -W "$(_${binName}_instances)" -- "$cur") )
              fi
              ;;
          esac
          ;;
        delete)
          case "$prev" in
            -i|--instance)
              COMPREPLY=( $(compgen -W "$(_${binName}_instances)" -- "$cur") )
              ;;
            *)
              if [[ "$cur" == -* ]]; then
                COMPREPLY=( $(compgen -W "-i --instance --purge --help" -- "$cur") )
              else
                COMPREPLY=( $(compgen -W "$(_${binName}_instances)" -- "$cur") )
              fi
              ;;
          esac
          ;;
        shell)
          case "$prev" in
            -i|--instance)
              COMPREPLY=( $(compgen -W "$(_${binName}_instances)" -- "$cur") )
              ;;
            *)
              if [[ "$cur" == -* ]]; then
                COMPREPLY=( $(compgen -W "-i --instance --help" -- "$cur") )
              else
                COMPREPLY=( $(compgen -W "$(_${binName}_instances)" -- "$cur") )
              fi
              ;;
          esac
          ;;
        register)
          COMPREPLY=( $(compgen -W "--project --help" -- "$cur") )
          ;;
        openclaw|oc)
          if type _openclaw_completion &>/dev/null; then
            # Delegate to cached openclaw completions
            # Rebuild COMP_WORDS without the clawctl prefix
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
          else
            # Static fallback
            case "$prev" in
              -i|--instance)
                COMPREPLY=( $(compgen -W "$(_${binName}_instances)" -- "$cur") )
                ;;
              *)
                if [[ "$cur" == -* ]]; then
                  COMPREPLY=( $(compgen -W "-i --instance --help" -- "$cur") )
                else
                  COMPREPLY=( $(compgen -W "$openclaw_subcommands" -- "$cur") )
                fi
                ;;
            esac
          fi
          ;;
        use)
          case "$prev" in
            use)
              if [[ "$cur" == -* ]]; then
                COMPREPLY=( $(compgen -W "--global --help" -- "$cur") )
              else
                COMPREPLY=( $(compgen -W "$(_${binName}_instances)" -- "$cur") )
              fi
              ;;
            *)
              COMPREPLY=( $(compgen -W "--global --help" -- "$cur") )
              ;;
          esac
          ;;
        completions)
          COMPREPLY=( $(compgen -W "bash zsh update-oc --help" -- "$cur") )
          ;;
      esac
    }

    complete -F _${binName}_completions ${binName}
  ` + "\n"
  );
}
