MinyanMate::Application.routes.draw do
  get "welcome/index"
  # The priority is based upon order of creation: first created -> highest priority.
  # See how all your routes lay out with "rake routes".

  # You can have the root of your site routed with "root"
  root 'welcome#index'

  # Example of regular route:
  #   get 'products/:id' => 'catalog#view'

  get '/about' => 'welcome#about'
  get '/stack' => 'welcome#stack'

  # Example of named route that can be invoked with purchase_url(id: product.id)
  #   get 'products/:id/purchase' => 'catalog#purchase', as: :purchase

  # Example resource route (maps HTTP verbs to controller actions automatically):
  #   resources :products

  resources :yids
  get '/yid/suggest/:event/:q' => 'yids#suggest', as: :suggest_search
  resources :minyans do
    post "star" => :star
    resources :events do
      # For adding arbitary new attendees
      post 'add_rsvp' => :rsvp
      # For adding arbitary new attendees
      post 'remove_rsvp' => :rsvp
      # For cancelling own attendance
      post 'attend' => :confirm_attend
      # For cancelling own attendance
      post 'cancel' => :cancel_attend
    end
  end

  get '/MyMinyans/' => 'minyans#myminyans', as: :my_minyans
  get '/MyAttendance/' => 'events#my_events', as: :my_events

  # Sessions to login and logout
  match 'auth/:provider/callback', to: 'sessions#login', as: 'signin', via: [:get, :post]
  match 'auth/failure', to: redirect('/'), via: [:get, :post]
  match 'signout', to: 'sessions#logout', as: 'signout', via: [:get, :post]
  

  # Example resource route with options:
  #   resources :products do
  #     member do
  #       get 'short'
  #       post 'toggle'
  #     end
  #
  #     collection do
  #       get 'sold'
  #     end
  #   end

  # Example resource route with sub-resources:
  #   resources :products do
  #     resources :comments, :sales
  #     resource :seller
  #   end

  # Example resource route with more complex sub-resources:
  #   resources :products do
  #     resources :comments
  #     resources :sales do
  #       get 'recent', on: :collection
  #     end
  #   end

  # Example resource route with concerns:
  #   concern :toggleable do
  #     post 'toggle'
  #   end
  #   resources :posts, concerns: :toggleable
  #   resources :photos, concerns: :toggleable

  # Example resource route within a namespace:
  #   namespace :admin do
  #     # Directs /admin/products/* to Admin::ProductsController
  #     # (app/controllers/admin/products_controller.rb)
  #     resources :products
  #   end
end
