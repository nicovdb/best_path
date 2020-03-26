Rails.application.routes.draw do
  devise_for :users
  root to: 'trips#create'
  resources :trips, only: [:new, :create, :show]
  resources :stops, only: [:create, :destroy]
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
