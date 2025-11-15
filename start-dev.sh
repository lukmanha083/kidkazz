#!/bin/bash

# Start tmux session
tmux new-session -d -s kidkazz

# Split window into 7 panes
tmux split-window -h
tmux split-window -v
tmux select-pane -t 0
tmux split-window -v
tmux select-pane -t 2
tmux split-window -v
tmux select-pane -t 4
tmux split-window -v
tmux select-pane -t 6
tmux split-window -v

# Start services in each pane
tmux select-pane -t 0
tmux send-keys "cd services/api-gateway && pnpm dev" C-m

tmux select-pane -t 1
tmux send-keys "cd services/product-service && pnpm dev" C-m

tmux select-pane -t 2
tmux send-keys "cd services/user-service && pnpm dev" C-m

tmux select-pane -t 3
tmux send-keys "cd services/order-service && pnpm dev" C-m

tmux select-pane -t 4
tmux send-keys "cd services/payment-service && pnpm dev" C-m

tmux select-pane -t 5
tmux send-keys "cd services/inventory-service && pnpm dev" C-m

tmux select-pane -t 6
tmux send-keys "cd services/shipping-service && pnpm dev" C-m

# Attach to session
tmux attach-session -t kidkazz
